import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-8xl font-bold font-mono text-[var(--border-color)] mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-[#F1F5F9] mb-2">Page not found</h2>
        <p className="text-sm text-[#94A3B8] mb-8 max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg text-sm font-medium text-white transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
