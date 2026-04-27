import { notFound } from "next/navigation";
import Script from "next/script";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { formatDate } from "@/lib/format";
import { getBlogPostBySlug, getBlogPosts } from "@/lib/blog-posts";

const estimateReadingMinutes = (text: string) => {
  const words = text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .length;

  return Math.max(1, Math.round(words / 170));
};

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Post not found",
      description: "This DotaData blog post could not be found.",
      alternates: {
        canonical: "/blog",
      },
    };
  }

  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.summary;

  return {
    title,
    description,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt ?? post.publishedAt,
      authors: [post.author],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export const revalidate = 86400;

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const readingMinutes = estimateReadingMinutes(
    post.blocks
      .map((block) => {
        if (block.type === "paragraph") {
          return block.text;
        }

        if (block.type === "heading") {
          return block.text;
        }

        return block.items.join(" ");
      })
      .join(" ")
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: {
      "@type": "Person",
      name: post.author,
    },
    mainEntityOfPage: `https://dotadata.com/blog/${post.slug}`,
    url: `https://dotadata.com/blog/${post.slug}`,
    keywords: post.tags.join(", "),
    publisher: {
      "@type": "Organization",
      name: "DotaData",
      url: "https://dotadata.com",
    },
  };

  return (
    <article className="space-y-10">
      <Breadcrumbs items={[{ url: "/blog", title: "Blog" }, { title: post.title }]} />
      <Script id={`blog-${post.slug}-ld-json`} type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </Script>

      <section className="space-y-4">
        <Badge className="w-fit bg-primary/10 text-primary">Article</Badge>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">{post.title}</h1>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          <span>{formatDate(post.publishedAt)}</span>
          <span>•</span>
          <span>{post.author}</span>
          <span>•</span>
          <span>{readingMinutes} min read</span>
          {post.updatedAt ? <span>• Updated {formatDate(post.updatedAt)}</span> : null}
        </div>
        <p className="max-w-3xl text-muted-foreground">{post.summary}</p>
        <div className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border/60 px-2 py-1 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      </section>

      <Card className="border-border/60 bg-card/80">
        <CardContent className="space-y-5 p-6">
          {post.blocks.map((block, index) => {
            if (block.type === "paragraph") {
              return (
                <p key={`${post.slug}-block-${index}`} className="leading-relaxed text-muted-foreground">
                  {block.text}
                </p>
              );
            }

            if (block.type === "heading") {
              return block.level === 3 ? (
                <h3 key={`${post.slug}-block-${index}`} className="text-xl font-semibold">
                  {block.text}
                </h3>
              ) : (
                <h2 key={`${post.slug}-block-${index}`} className="text-2xl font-semibold">
                  {block.text}
                </h2>
              );
            }

            return (
              <ul key={`${post.slug}-block-${index}`} className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          })}
        </CardContent>
      </Card>
    </article>
  );
}
