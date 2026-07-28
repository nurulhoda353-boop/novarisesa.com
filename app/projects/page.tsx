import type { Metadata } from "next";
import { ProjectsView } from "@/views/ProjectsView";
import { cmsPageMetadata } from "@/lib/cms-metadata";

const fallbackMetadata: Metadata = {
  title: "Our Projects — NOVARISE",
  description:
    "Explore NOVARISE's portfolio of industrial, power, civil and petrochemical megaprojects delivered across Saudi Arabia.",
  alternates: { canonical: "/projects" },
  openGraph: {
    images: ["/og-image.jpg"],
    url: "/projects",
    title: "Our Projects — NOVARISE",
    description:
      "A track record written in steel — NOVARISE megaprojects with Saudi Aramco, SABIC, ACWA Power, PIF and more.",
  },
};
export const generateMetadata = () => cmsPageMetadata("projects", fallbackMetadata);

export default function Page() {
  return <ProjectsView />;
}
