import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/leagues", label: "Leagues" },
  { href: "/teams", label: "Teams" },
  { href: "/the-international", label: "The International" },
  { href: "/patches", label: "Patches" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            DD
          </span>
          DotaData
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="text-muted-foreground hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" className="hidden md:inline-flex">
            <Link href="/leagues">Explore stats</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
