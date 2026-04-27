# Supabase setup

This project already includes the SQL schema in `supabase/schema.sql` and starter data in `supabase/seed.sql`.

## 1) Create a Supabase project

1. Open the Supabase dashboard and create a new project.
2. Copy your:
   - Project URL
   - Anonymous public key

## 2) Apply schema

In the Supabase SQL editor:

1. Open a new query.
2. Run the contents of:
   - `supabase/schema.sql`

## 3) Load seed data

Use the SQL editor again and run:

1. `supabase/seed.sql`

## 4) Local environment

Update `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BLOG_ADMIN_TOKEN=your-random-token
```

## 5) Blog write endpoint (AI friendly)

- Endpoint: `POST /api/blog-posts`
- Required header: `Authorization: Bearer <BLOG_ADMIN_TOKEN>`
- Required JSON body:
  - `slug`
  - `title`
  - `summary`
  - `content`
  - `publishedAt`
- Optional JSON body:
  - `author`
  - `tags`
  - `seoTitle`
  - `seoDescription`
  - `isPublished` (default true)

Seeded content includes three starter rows in `public.blog_posts`:

- `building-a-content-led-blog-for-dotadata`
- `patch-analysis-framework-for-dota2-fans`
- `blog-seo-checklist-for-analytics-sites`

## 6) Optional local Supabase with CLI

If you use `supabase` CLI:

1. Install CLI and run `supabase init` in the repo root.
2. Use `supabase db reset` for local development.
3. Run `supabase db push` (or SQL editor equivalent) when schemas change.

## 7) Verify

- `/leagues`, `/teams`, `/patches`, and `/` should populate with live Supabase rows.
- If env vars are missing, the app falls back to local mock data automatically.
