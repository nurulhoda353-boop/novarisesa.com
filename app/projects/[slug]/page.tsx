import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allProjects, getProjectBySlug } from "@/lib/projects-data";
import { absoluteUrl } from "@/lib/site";
import { ProjectDetailView } from "@/views/ProjectDetailView";

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
  return {
    title: "Project — NOVARISE",
    alternates: { canonical },
    openGraph: { url: canonical, images: [project.img] },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  return <ProjectDetailView project={project} />;
}
