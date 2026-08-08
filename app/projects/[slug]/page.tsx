import type { Metadata } from "next";
import { allProjects, getProjectBySlug } from "@/lib/projects-data";
import { absoluteUrl } from "@/lib/site";
import { ProjectDetailView } from "@/views/ProjectDetailView";
import { cmsDetailMetadata } from "@/lib/cms-detail-metadata";

export function generateStaticParams() {
  return allProjects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  const canonical = absoluteUrl(`/projects/${project.slug}`);
  return cmsDetailMetadata("projects", slug, {
    title: "Project — NOVARISE",
    alternates: { canonical },
    openGraph: { url: canonical, images: [project.img] },
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug) ?? {
    key: slug,
    slug,
    img: "/assets/project-civil.jpg",
    rank: 0,
  };
  return <ProjectDetailView project={project} />;
}

export const dynamicParams = true;
