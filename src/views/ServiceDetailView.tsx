"use client";

import { ServiceDetailPage } from "@/components/services/ServiceDetailPage";
import { useTranslatedService } from "@/i18n/use-translated-service";
import { useCmsContent } from "@/lib/cms-content";

export function ServiceDetailView({ slug }: { slug: string }) {
  const service = useTranslatedService(slug);
  const { loading } = useCmsContent();
  if (loading) return <main className="min-h-screen bg-background" />;
  if (!service) return <main className="min-h-screen grid place-items-center">Service not found.</main>;
  return <ServiceDetailPage service={service} />;
}
