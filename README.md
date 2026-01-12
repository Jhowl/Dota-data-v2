# DotaData Web

Next.js frontend for dotadata.org.

## Local dev

```bash
npm install
npm run dev
```

## Production build (Docker)

```bash
docker buildx build --platform linux/amd64 -t dotadata-web:latest \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY \
  -f Dockerfile . --load
```

## Deploy (example)

Build locally, export the image, upload, and run on a server with Docker.

```bash
# save
docker save dotadata-web:latest -o dotadata-web.tar

# upload (example)
scp -i ~/.ssh/your_key dotadata-web.tar user@your.server:/tmp/dotadata-web.tar

# load + run (example)
ssh -i ~/.ssh/your_key user@your.server "docker load -i /tmp/dotadata-web.tar"
ssh -i ~/.ssh/your_key user@your.server \
  "docker rm -f dotadata-web || true && \
   docker run -d --name dotadata-web --restart unless-stopped \
   -p 3000:3000 \
   -e N8N_CONTACT_WEBHOOK_URL=https://example.com/webhook/your-id \
   dotadata-web:latest"
```

## Nginx (example)

Proxy to the container on port 3000.

```
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

## Environment

Build-time:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Runtime:
- `N8N_CONTACT_WEBHOOK_URL`
