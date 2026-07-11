import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">404</div>
        <h1 className="text-3xl md:text-4xl font-bold text-navy">Page not found</h1>
        <p className="mt-3 text-muted-foreground">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-deep"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
