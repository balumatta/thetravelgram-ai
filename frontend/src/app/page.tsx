import HomePage from "@/components/site/HomePage";
import SiteShell from "@/components/site/SiteShell";
import { listHighlights, listPhotos, listPublishedBlogs, siteStats } from "@/lib/publishedBlogs";

// Built from content/blogs at build time, so the home page needs no backend.
export default function Home() {
  return (
    <SiteShell active="stories">
      <HomePage stories={listPublishedBlogs()} highlights={listHighlights()} photos={listPhotos()} stats={siteStats()} />
    </SiteShell>
  );
}
