import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RichBlogView from "@/components/composer/RichBlogView";
import SiteShell from "@/components/site/SiteShell";
import { getPublishedBlog, heroInfo, listPublishedSlugs } from "@/lib/publishedBlogs";

// Every published blog is built into a static page from content/blogs — no backend at runtime.
export const dynamicParams = false;

export function generateStaticParams() {
  return listPublishedSlugs().map((slug) => ({ slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const blog = getPublishedBlog((await params).slug);
  if (!blog) return {};
  return {
    title: `${blog.title} · The Travel Gram`,
    description: blog.subtitle || blog.excerpt,
    openGraph: { title: blog.title, description: blog.subtitle || blog.excerpt, images: blog.banner_url ? [blog.banner_url] : [] },
  };
}

export default async function PublishedBlogPage({ params }: Params) {
  const blog = getPublishedBlog((await params).slug);
  if (!blog) notFound();
  const { kicker, facts } = heroInfo(blog);

  return (
    <SiteShell>
      <RichBlogView
        title={blog.title}
        subtitle={blog.subtitle}
        bannerUrl={blog.banner_url}
        html={blog.content}
        sections={blog.sections ?? []}
        kicker={kicker}
        facts={facts}
      />
    </SiteShell>
  );
}
