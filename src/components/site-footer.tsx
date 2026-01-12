import Link from "next/link";

const links = [
  { href: "/leagues", label: "Leagues" },
  { href: "/teams", label: "Teams" },
  { href: "/seasons", label: "Seasons" },
  { href: "/the-international", label: "The International" },
  { href: "/patches", label: "Patches" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/80">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_1fr] md:px-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              DD
            </span>
            DotaData
          </div>
          <p className="text-sm text-muted-foreground">
            Competitive Dota 2 data platform focused on leagues, teams, and patch insights. Built for analysts,
            fans, and esports operators.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        {new Date().getFullYear()} DotaData. All rights reserved.
      </div>
    </footer>
  );
}
