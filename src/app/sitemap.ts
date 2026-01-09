import type { MetadataRoute } from "next";

import { getLeagues, getTeams } from "@/lib/supabase/queries";

const baseUrl = "https://dotadata.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [leagues, teams] = await Promise.all([getLeagues(), getTeams()]);
  const now = new Date();

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
  ];
}
