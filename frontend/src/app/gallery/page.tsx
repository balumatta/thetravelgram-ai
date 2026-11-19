import type { Metadata } from "next";
import Gallery from "@/components/site/Gallery";
import SiteShell from "@/components/site/SiteShell";
import { listPhotos } from "@/lib/publishedBlogs";

export const metadata: Metadata = {
  title: "Gallery · The Travel Gram",
  description: "Every photo from every trip on The Travel Gram.",
};

// Built from content/blogs at build time; no backend needed.
export default function GalleryPage() {
  return (
    <SiteShell active="gallery">
      <Gallery photos={listPhotos()} />
    </SiteShell>
  );
}
