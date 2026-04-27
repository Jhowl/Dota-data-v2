import "server-only";

import { supabase } from "@/lib/supabase/client";
import { withRedisCache } from "@/lib/cache/redis";

export type BlogBlockType = "paragraph" | "heading" | "list";

export type BlogPostBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "heading";
      level: 2 | 3;
      text: string;
    }
  | {
      type: "list";
      items: string[];
    };

export type BlogPost = {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  updatedAt?: string | null;
  author: string;
  tags: string[];
  seoTitle?: string;
  seoDescription?: string;
  blocks: BlogPostBlock[];
};

export type BlogPostSummary = Omit<BlogPost, "blocks">;

type BlogPostRow = {
  slug: string | null;
  title: string | null;
  summary: string | null;
  content_markdown: string | null;
  published_at: string | null;
  updated_at: string | null;
  author: string | null;
  tags: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
};

const parseMarkdownToBlocks = (markdown: string): BlogPostBlock[] => {
  const blocks: BlogPostBlock[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }
    const text = paragraphLines.join(" ").trim().replace(/\s+/g, " ");
    if (text) {
      blocks.push({ type: "paragraph", text });
    }
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length) {
      return;
    }
    blocks.push({ type: "list", items: listItems });
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 3, text: trimmed.slice(4).trim() });
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: 2, text: trimmed.slice(3).trim() });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const item = trimmed.replace(/^[-*]\s+/, "").trim();
      if (item) {
        listItems.push(item);
      }
      continue;
    }

    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  if (!blocks.length && markdown.trim()) {
    blocks.push({ type: "paragraph", text: markdown.trim() });
  }

  return blocks;
};

const normalizeDate = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
};

const buildTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const mapBlogSummaryRow = (row: BlogPostRow): BlogPostSummary | null => {
  const slug = row.slug?.trim();
  const title = row.title?.trim();
  const summary = row.summary?.trim();
  const publishedAt = normalizeDate(row.published_at);

  if (!slug || !title || !summary || !publishedAt) {
    return null;
  }

  return {
    slug,
    title,
    summary,
    publishedAt,
    updatedAt: normalizeDate(row.updated_at),
    author: row.author?.trim() || "DotaData Editorial",
    tags: buildTags(row.tags).length ? buildTags(row.tags) : ["DotaData"],
    seoTitle: row.seo_title?.trim() || undefined,
    seoDescription: row.seo_description?.trim() || undefined,
  };
};

const mapBlogRow = (row: BlogPostRow): BlogPost | null => {
  const slug = row.slug?.trim();
  const title = row.title?.trim();
  const summary = row.summary?.trim();
  const contentMarkdown = row.content_markdown?.trim();
  const publishedAt = normalizeDate(row.published_at);

  if (!slug || !title || !summary || !contentMarkdown || !publishedAt) {
    return null;
  }

  const blocks = parseMarkdownToBlocks(contentMarkdown);
  if (!blocks.length) {
    return null;
  }

  return {
    slug,
    title,
    summary,
    publishedAt,
    updatedAt: normalizeDate(row.updated_at),
    author: (row.author?.trim() || "DotaData Editorial"),
    tags: buildTags(row.tags).length ? buildTags(row.tags) : ["DotaData"],
    seoTitle: row.seo_title?.trim() || undefined,
    seoDescription: row.seo_description?.trim() || undefined,
    blocks,
  };
};

export const getBlogPosts = async (): Promise<BlogPostSummary[]> => {
  const client = supabase;
  if (!client) {
    return [];
  }

  return withRedisCache("blog-posts:list", 300, async () => {
    const { data, error } = await client
      .from("blog_posts")
      .select("slug, title, summary, published_at, updated_at, author, tags, seo_title, seo_description")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data
      .map((row) => mapBlogSummaryRow(row as BlogPostRow))
      .filter((post): post is BlogPostSummary => Boolean(post));
  });
};

export const getBlogPostBySlug = async (slug: string): Promise<BlogPost | undefined> => {
  const client = supabase;
  if (!client || !slug.trim()) {
    return undefined;
  }

  const normalizedSlug = slug.trim();
  return withRedisCache(`blog-post:${normalizedSlug}`, 900, async () => {
    const { data, error } = await client
      .from("blog_posts")
      .select(
        "slug, title, summary, content_markdown, published_at, updated_at, author, tags, seo_title, seo_description"
      )
      .eq("slug", normalizedSlug)
      .eq("is_published", true)
      .maybeSingle();

    if (error || !data) {
      return undefined;
    }

    return mapBlogRow(data as BlogPostRow) ?? undefined;
  });
};
