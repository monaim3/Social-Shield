import type { BlockProfile, ReferenceImage } from "@shared/types/profile";
import { ImagesDB, type StoredReferenceImage } from "@shared/storage/imagesDB";
import { StorageService } from "@shared/storage/StorageService";
import { computePHashFromSource } from "@/ai/image/phash";
import { makeThumbnailDataUrl } from "@/ai/image/thumbnail";
import { descriptorToArray, extractSingleFace } from "@/ai/face/service";
import { uid } from "@shared/utils/id";

/** Add a File to a profile: compute hash + thumbnail, persist blob to IDB, update profile.referenceImages. */
export interface AddImageOptions {
  computeFace?: boolean;
}

export async function addReferenceImageFile(
  profileId: string,
  file: File,
  opts: AddImageOptions = {},
): Promise<ReferenceImage> {
  const [hash, thumbnail] = await Promise.all([
    computePHashFromSource(file),
    makeThumbnailDataUrl(file),
  ]);

  let embedding: number[] | undefined;
  if (opts.computeFace) {
    try {
      const face = await extractSingleFace({ source: file });
      if (face) embedding = descriptorToArray(face.descriptor);
    } catch {
      /* face detection failed — leave embedding undefined */
    }
  }

  const stored: StoredReferenceImage = {
    id: uid("img"),
    profileId,
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    createdAt: Date.now(),
    perceptualHash: hash,
    thumbnail,
    embedding,
    blob: file,
  };
  await ImagesDB.put(stored);

  const meta: ReferenceImage = {
    id: stored.id,
    profileId: stored.profileId,
    name: stored.name,
    mime: stored.mime,
    size: stored.size,
    createdAt: stored.createdAt,
    perceptualHash: stored.perceptualHash,
    thumbnail: stored.thumbnail,
    embedding: stored.embedding,
  };
  await updateProfileImages(profileId, (current) => [...current, meta]);
  return meta;
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
