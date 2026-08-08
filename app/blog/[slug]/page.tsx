import type { Metadata } from "next";
import { posts, featuredPost } from "@/lib/blog-data";
import { absoluteUrl } from "@/lib/site";
import { BlogPostDetailView } from "@/views/BlogPostDetailView";
import { cmsDetailMetadata } from "@/lib/cms-detail-metadata";

const allStaticPosts = [featuredPost, ...posts];

export function generateStaticParams() {
  return allStaticPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = allStaticPosts.find((p) => p.slug === slug);
  if (!post) return {};
  const canonical = absoluteUrl(`/blog/${post.slug}`);
  return cmsDetailMetadata("posts", slug, {
    title: `${post.title} — NOVARISE Insights`,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: {
      url: canonical,
      title: post.title,
      description: post.excerpt,
      images: [post.image],
    },
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <BlogPostDetailView slug={slug} />;
}

export const dynamicParams = true;
