import type { BlockProfile, ReferenceImage } from "@shared/types/profile";
import { ImagesDB, type StoredReferenceImage } from "@shared/storage/imagesDB";
import { StorageService } from "@shared/storage/StorageService";
import { computePHashFromSource } from "@/ai/image/phash";
import { makeThumbnailDataUrl } from "@/ai/image/thumbnail";
import { descriptorToArray, extractAllFacesWithCrops, extractSingleFace } from "@/ai/face/service";
import { uid } from "@shared/utils/id";

/** Add a File to a profile: compute hash + thumbnail + face descriptor, persist blob to IDB. */
export interface AddImageOptions {
  /** Force-skip face detection (default: always try). Face similarity toggle
   *  can be flipped on later without re-uploading. */
  skipFace?: boolean;
  /**
   * When multiple faces detected in the uploaded photo, add each as a separate
   * reference (own cropped thumbnail + own embedding). Off by default; the
   * primary path still yields exactly one reference per uploaded file for
   * predictable behavior. Turn on for interview / group / panel photos.
   */
  expandMultiFace?: boolean;
}

export interface AddImageResult {
  primary: ReferenceImage;
  /** Extra face references created when expandMultiFace is on. */
  extras: ReferenceImage[];
  /** How many faces were detected in total (>= 1 when face detection worked). */
  faceCount: number;
}

export async function addReferenceImageFile(
  profileId: string,
  file: File,
  opts: AddImageOptions = {},
): Promise<AddImageResult> {
  const [hash, thumbnail] = await Promise.all([
    computePHashFromSource(file),
    makeThumbnailDataUrl(file),
  ]);

  let faces: Awaited<ReturnType<typeof extractAllFacesWithCrops>> = [];
  if (!opts.skipFace) {
    try {
      if (opts.expandMultiFace) {
        faces = await extractAllFacesWithCrops({ source: file });
      } else {
        const one = await extractSingleFace({ source: file });
        if (one) {
          faces = [
            {
              descriptor: one.descriptor,
              score: one.score,
              box: { x: 0, y: 0, width: 0, height: 0 },
              cropDataUrl: "",
            },
          ];
        }
      }
    } catch {
      /* face detection failed — leave faces empty; still store the image */
    }
  }

  // Primary reference: the original uploaded file. Blob only stored here.
  const primaryEmbedding =
    faces.length > 0 && !opts.expandMultiFace ? descriptorToArray(faces[0].descriptor) : undefined;

  const primaryStored: StoredReferenceImage = {
    id: uid("img"),
    profileId,
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    createdAt: Date.now(),
    perceptualHash: hash,
    thumbnail,
    embedding: primaryEmbedding,
    blob: file,
  };
  await ImagesDB.put(primaryStored);
  const primaryMeta = toMeta(primaryStored);

  // Extras: one per additional face when expanding. Each carries the cropped
  // thumbnail + descriptor, no blob (blob stays with the primary).
  const extras: ReferenceImage[] = [];
  if (opts.expandMultiFace && faces.length) {
    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      const stored: StoredReferenceImage = {
        id: uid("img"),
        profileId,
        name: `${file.name} · face ${i + 1}`,
        mime: "image/png",
        size: 0,
        createdAt: Date.now(),
        perceptualHash: undefined,
        thumbnail: face.cropDataUrl || thumbnail,
        embedding: descriptorToArray(face.descriptor),
        blob: file, // reference the original blob for later re-render if needed
      };
      await ImagesDB.put(stored);
      extras.push(toMeta(stored));
    }
  }

  await updateProfileImages(profileId, (current) => [...current, primaryMeta, ...extras]);
  return { primary: primaryMeta, extras, faceCount: faces.length };
}

function toMeta(s: StoredReferenceImage): ReferenceImage {
  return {
    id: s.id,
    profileId: s.profileId,
    name: s.name,
    mime: s.mime,
    size: s.size,
    createdAt: s.createdAt,
    perceptualHash: s.perceptualHash,
    thumbnail: s.thumbnail,
    embedding: s.embedding,
  };
}

export async function removeReferenceImage(profileId: string, refImageId: string): Promise<void> {
  await ImagesDB.delete(refImageId);
  await updateProfileImages(profileId, (current) => current.filter((r) => r.id !== refImageId));
}

async function updateProfileImages(
  profileId: string,
  fn: (current: ReferenceImage[]) => ReferenceImage[],
): Promise<void> {
  const profiles = await StorageService.getProfiles();
  const next = profiles.map((p): BlockProfile => {
    if (p.id !== profileId) return p;
    return { ...p, referenceImages: fn(p.referenceImages), updatedAt: Date.now() };
  });
  await StorageService.saveProfiles(next);
}
