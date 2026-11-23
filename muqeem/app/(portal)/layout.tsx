import { Suspense } from "react";
import { AuthGate } from "@/components/Auth";
import { Shell } from "@/components/Shell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <Shell>{children}</Shell>
      </Suspense>
    </AuthGate>
  );
}
