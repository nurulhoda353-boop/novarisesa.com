import { AuthGate } from "@/components/Auth";
import { Shell } from "@/components/Shell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <Shell>{children}</Shell>
    </AuthGate>
  );
}
