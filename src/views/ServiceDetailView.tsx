"use client";

import { useTranslation } from "react-i18next";
import { ServiceDetailPage } from "@/components/services/ServiceDetailPage";
import { useTranslatedService } from "@/i18n/use-translated-service";
import { useCmsContent } from "@/lib/cms-content";

export function ServiceDetailView({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const service = useTranslatedService(slug);
  const { loading } = useCmsContent();
  if (service) return <ServiceDetailPage service={service} />;
  if (loading) return <main className="min-h-screen bg-background" />;
  return <main className="min-h-screen grid place-items-center" data-cms-field="servicesPage.detail.notFound" suppressContentEditableWarning>{t("servicesPage.detail.notFound")}</main>;
}
