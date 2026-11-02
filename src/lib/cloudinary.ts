/** Media lives on Cloudinary; public IDs match scripts/upload-cloudinary.mjs. */
const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "ev6fygsf";

export const CLOUDINARY_BASE = `https://res.cloudinary.com/${cloud}`;

/** Untransformed image URL — the next/image loader adds size/format per request. */
export function cldImage(publicId: string) {
  return `${CLOUDINARY_BASE}/image/upload/${publicId}`;
}

/** Image URL with explicit transforms, for places that bypass next/image (posters, OG). */
export function cldImageWith(publicId: string, transforms: string) {
  return `${CLOUDINARY_BASE}/image/upload/${transforms}/${publicId}`;
}

/** Adaptive-format, adaptive-quality video capped at the given width. */
export function cldVideo(publicId: string, width = 1280) {
  return `${CLOUDINARY_BASE}/video/upload/f_auto:video,q_auto,c_limit,w_${width}/${publicId}`;
}

/** Inserts transforms into an existing Cloudinary upload URL. */
export function withTransforms(url: string, transforms: string) {
  return url.replace("/image/upload/", `/image/upload/${transforms}/`);
}

export const media = {
  heroVideo: cldVideo("elitetravel/media/web-hero-background"),
  heroPoster: cldImageWith("elitetravel/media/hero-frame", "f_auto,q_auto,w_1920"),
  /** Same frame through next/image, so phones get a screen-sized copy instead of the 1920 px poster */
  heroStill: cldImage("elitetravel/media/hero-frame"),
  seascapeVideo: cldVideo("elitetravel/media/web-hero-seascape"),
  seascapePoster: cldImageWith("elitetravel/media/web-hero-seascape-frame", "f_auto,q_auto,w_1600"),
};
