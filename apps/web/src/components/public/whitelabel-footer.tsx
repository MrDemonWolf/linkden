"use client";

interface WhitelabelFooterProps {
  brandName?: string;
  brandLogo?: string;
}

export function WhitelabelFooter({ brandName, brandLogo }: WhitelabelFooterProps) {
  if (brandName || brandLogo) {
    return (
      <footer className="mt-12 pb-8 text-center">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {brandLogo && <img src={brandLogo} alt={brandName || ""} className="h-4 w-auto" />}
          {brandName && <span>{brandName}</span>}
        </a>
      </footer>
    );
  }

  return (
    <footer className="mt-12 pb-8 text-center">
      <a
        href="https://github.com/mrdemonwolf/LinkDen"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        Powered by{" "}
        <span className="font-semibold">
          <span className="text-brand-cyan">Link</span>Den
        </span>
      </a>
    </footer>
  );
}
