import { MobileHome } from "@/components/MobileHome";

/**
 * This deployment is the native app's own site, so the start screen is always the app home.
 * The cinematic desktop landing (video, scroll effects) lives only in the public website project.
 */
export default function HomePage() {
  return <MobileHome />;
}
