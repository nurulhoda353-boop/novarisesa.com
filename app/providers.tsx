"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { I18nProvider } from "@/i18n/I18nProvider";
import "@/i18n/config";
import { CmsContentProvider } from "@/lib/cms-content";
import { EditModeProvider } from "@/components/cms/EditModeContext";
import { AssetOverlay } from "@/components/cms/AssetOverlay";
import { SmoothScroll } from "@/components/site/SmoothScroll";
import { ScrollProgress } from "@/components/site/ScrollProgress";
import { NoiseOverlay } from "@/components/site/NoiseOverlay";
import { CustomCursor } from "@/components/site/CustomCursor";
import { PageTransitionLoader } from "@/components/site/PageTransitionLoader";
import { useTitleReveal } from "@/hooks/use-title-reveal";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  useTitleReveal();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <CmsContentProvider>
          <EditModeProvider>
            <AssetOverlay />
            <SmoothScroll />
            <ScrollProgress />
            {children}
            <NoiseOverlay />
            <CustomCursor />
            <PageTransitionLoader />
            <Toaster position="top-center" richColors closeButton theme="light" />
          </EditModeProvider>
        </CmsContentProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
