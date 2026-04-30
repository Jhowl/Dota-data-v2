import Link from "next/link";

import { ShareButton } from "@/components/share-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { getBlogPosts } from "@/lib/blog-posts";

export const metadata = {
  title: "DotaData Blog - Dota 2 Analytics and Strategy Insights",
  description:
    "Read DotaData writing on patch trends, team dynamics, league recaps, and practical Dota 2 analytics insights.",
  keywords: [
    "Dota 2 blog",
    "Dota 2 patch analysis",
    "Dota 2 teams",
    "Dota 2 leagues",
    "Dota 2 analytics",
  ],
  openGraph: {
    title: "DotaData Blog - Dota 2 Analytics and Strategy Insights",
    description:
      "Read DotaData writing on patch trends, team dynamics, league recaps, and practical Dota 2 analytics insights.",
    type: "website",
    url: "/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "DotaData Blog - Dota 2 Analytics and Strategy Insights",
    description:
      "Read DotaData writing on patch trends, team dynamics, league recaps, and practical Dota 2 analytics insights.",
  },
  alternates: {
    canonical: "/blog",
  },
};

export const revalidate = 86400;

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Badge className="w-fit bg-primary/10 text-primary">Blog</Badge>
          <ShareButton
            title="DotaData Blog"
            text="📝 DotaData Blog — patch trends, team dynamics, league recaps, and Dota 2 analytics insights"
            url="/blog"
          />
        </div>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">DotaData Blog</h1>
        <p className="max-w-2xl text-muted-foreground">
          SEO-friendly analysis, strategy insight, and match breakdowns that can be expanded quickly by your AI content agent.
        </p>
      </section>

      <section className="space-y-4">
        {posts.length ? (
          posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block" prefetch={false}>
              <Card className="border-border/60 bg-card/80 transition hover:border-primary/40">
                <CardContent className="space-y-3 p-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(post.publishedAt)}</span>
                    <span className="text-muted-foreground/70">•</span>
                    <span>{post.author}</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground">{post.title}</h2>
                  <p className="max-w-3xl text-sm text-muted-foreground">{post.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-border/60 px-2 py-1 text-xs text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        ) : (
          <Card className="border-border/60 bg-card/80">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">No posts yet. Create posts via the Supabase <code>blog_posts</code> table.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
