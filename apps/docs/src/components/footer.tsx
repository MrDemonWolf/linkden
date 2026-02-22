import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-fd-border py-6 text-center text-xs text-fd-muted-foreground">
      <div>
        &copy; {year}{" "}
        <a href="https://github.com/mrdemonwolf/linkden" target="_blank" rel="noopener noreferrer" className="font-medium transition-colors hover:text-fd-foreground">LinkDen</a>
        {" "}by{" "}
        <a href="https://www.mrdemonwolf.com" target="_blank" rel="noopener noreferrer" className="font-medium transition-colors hover:text-fd-foreground">MrDemonWolf, Inc.</a>
      </div>
      <div className="mt-2 flex items-center justify-center gap-3">
        <Link href="/docs/privacy-policy" className="transition-colors hover:text-fd-foreground">Privacy Policy</Link>
        <span>&middot;</span>
        <Link href="/docs/terms-of-service" className="transition-colors hover:text-fd-foreground">Terms of Service</Link>
      </div>
    </footer>
  );
}
