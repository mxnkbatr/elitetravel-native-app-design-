import { withTransforms } from "@/lib/cloudinary";

/** The tour page poster's sizes, shared with TourPreload so the warmed-up file is the one the page asks for. */
export const POSTER_SIZES = "(max-width:1024px) 100vw, 560px";

/** A ~1 KB blurred poster: the glow behind the tour hero and the poster's stand-in until the photo arrives. */
export const posterGlow = (image: string) => withTransforms(image, "w_48,q_40,e_blur:800,e_saturation:50");
