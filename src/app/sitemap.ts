import type { MetadataRoute } from "next";

import { getLeagues, getPatches, getTeams } from "@/lib/supabase/queries";

const baseUrl = "https://dotadata.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [leagues, teams, patches] = await Promise.all([getLeagues(), getTeams(), getPatches()]);
  const now = new Date();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: Math.max(0, currentYear - 2022) }, (_, index) => 2023 + index);

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/leagues`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/teams`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/seasons`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/the-international`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/patches`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...years.map((year) => ({
      url: `${baseUrl}/seasons/${year}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...leagues.map((league) => ({
      url: `${baseUrl}/leagues/${league.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...teams.map((team) => ({
      url: `${baseUrl}/teams/${team.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...patches.map((patch) => ({
      url: `${baseUrl}/patches/${encodeURIComponent(patch.patch)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
