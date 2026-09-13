import { describe, expect, it } from "vitest";
import { aHashFromGrayscale, hammingDistance } from "./phash";

function gradient(): Uint8Array {
  const out = new Uint8Array(64);
  for (let i = 0; i < 64; i++) out[i] = i * 4;
  return out;
}

function uniform(v: number): Uint8Array {
  const out = new Uint8Array(64);
  out.fill(v);
  return out;
}

function checker(): Uint8Array {
  const out = new Uint8Array(64);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) out[y * 8 + x] = (x + y) % 2 === 0 ? 255 : 0;
  return out;
}

describe("aHashFromGrayscale", () => {
  it("produces 16-char hex", () => {
    const h = aHashFromGrayscale(gradient());
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  it("throws on wrong length", () => {
    expect(() => aHashFromGrayscale(new Uint8Array(63))).toThrow();
  });

  it("identical input → identical hash", () => {
    expect(aHashFromGrayscale(gradient())).toBe(aHashFromGrayscale(gradient()));
  });

  it("uniform image → deterministic", () => {
    // All pixels equal to mean → all bits 1 (>=).
    expect(aHashFromGrayscale(uniform(128))).toBe("ffffffffffffffff");
  });

  it("checker pattern → half bits set", () => {
    const h = aHashFromGrayscale(checker());
    const dist = hammingDistance(h, "0000000000000000");
    expect(dist).toBe(32);
  });
});

describe("hammingDistance", () => {
  it("zero for identical", () => {
    expect(hammingDistance("ffffffffffffffff", "ffffffffffffffff")).toBe(0);
  });
  it("64 for inverted", () => {
    expect(hammingDistance("ffffffffffffffff", "0000000000000000")).toBe(64);
  });
  it("single bit diff", () => {
    expect(hammingDistance("0000000000000000", "0000000000000001")).toBe(1);
    expect(hammingDistance("0000000000000000", "0000000000000002")).toBe(1);
    expect(hammingDistance("0000000000000000", "0000000000000003")).toBe(2);
  });
  it("returns Infinity on length mismatch", () => {
    expect(hammingDistance("abc", "abcd")).toBe(Number.POSITIVE_INFINITY);
  });
});
