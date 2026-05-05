import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/session";
import { getUserBySteamid } from "@/lib/auth/users";

export async function SiteAuth() {
  const t = await getTranslations("auth");

  let session: Awaited<ReturnType<typeof getSession>> = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }

  if (!session) {
    return (
      <Button asChild variant="outline" size="sm">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/auth/steam/login">{t("signInSteam")}</a>
      </Button>
    );
  }

  const user = await getUserBySteamid(session.sub);
  const displayName =
    user?.personaName?.trim() || `Steam ${session.sub.slice(-4)}`;

  return (
    <form action="/api/auth/logout" method="post" className="flex items-center gap-2">
      {user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatarUrl}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 rounded-full border border-border/60 object-cover"
        />
      ) : null}
      <span className="hidden max-w-[10rem] truncate text-sm font-medium md:inline">
        {displayName}
      </span>
      <Button type="submit" variant="ghost" size="sm">
        {t("signOut")}
      </Button>
    </form>
  );
}
