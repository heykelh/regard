"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/methode", label: "Du brut au gold" },
  { href: "/copilote/qualite", label: "Qualité des données" },
];

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-mono text-sm tracking-widest text-foreground">
          <span className="inline-block size-2 rounded-full bg-primary" />
          REGARD
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto">
          <NavLink href="/" label="Accueil" active={isActive("/")} icon />
          {LINKS.map((l) => (
            <NavLink key={l.href} href={l.href} label={l.label} active={isActive(l.href)} />
          ))}
          <Link
            href="/copilote"
            className={cn(
              "ml-1 shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              isActive("/copilote")
                ? "bg-primary text-primary-foreground"
                : "border border-border text-foreground hover:bg-muted"
            )}
          >
            Copilote
          </Link>
        </div>
      </nav>
    </header>
  );
}

function NavLink({ href, label, active, icon }: { href: string; label: string; active: boolean; icon?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors sm:text-sm",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon && <Home className="size-3.5" />}
      {label}
    </Link>
  );
}