"use client";

import { ServiceDetailPage } from "@/components/services/ServiceDetailPage";
import { getServiceBySlug } from "@/lib/services-data";

export function ServiceDetailView({ slug }: { slug: string }) {
  const service = getServiceBySlug(slug);
  if (!service) return null;
  return <ServiceDetailPage service={service} />;
}
