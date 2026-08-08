import type { Metadata } from "next";
import { ServiceDetailView } from "@/views/ServiceDetailView";
import { servicePages, getServiceBySlug } from "@/lib/services-data";
import { absoluteUrl } from "@/lib/site";
import { cmsDetailMetadata } from "@/lib/cms-detail-metadata";

export function generateStaticParams() {
  return servicePages.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};
  const canonical = absoluteUrl(`/services/${service.slug}`);
  return cmsDetailMetadata("services", slug, {
    title: service.metaTitle,
    description: service.metaDescription,
    alternates: { canonical },
    openGraph: {
      url: canonical,
      title: service.metaTitle,
      description: service.metaDescription,
      images: [service.heroImage],
    },
  });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ServiceDetailView slug={slug} />;
}

export const dynamicParams = true;
