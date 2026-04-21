# Render Deployment Guide

This project deploys cleanly to Render as three resources:

- PostgreSQL database
- Node web service for API
- Static site for React web app

A starter Render blueprint is provided in render.yaml.

## Why this setup works

- API authentication uses HttpOnly cookies and CORS credentials.
- Web and API run on Render subdomains under onrender.com, which is same-site.
- The web app API base URL is configurable via VITE_API_BASE_URL.

## One-time setup in Render

1. Push this repository to GitHub.
2. In Render, create a new Blueprint and select this repository.
3. Render will detect render.yaml and create:
   - family-manager-postgres
   - family-manager-api
   - family-manager-web

## Required environment values

Set these values after initial provisioning:

- family-manager-api
  - AUTH_JWT_SECRET: long random value (required)
  - WEB_ORIGIN: your deployed web URL
- family-manager-web
  - VITE_API_BASE_URL: your deployed API URL with /api/v1 suffix

If your service names differ from defaults, update WEB_ORIGIN and VITE_API_BASE_URL accordingly.

## Production migration behavior

The API start command runs Prisma migrations on deploy:

- npx prisma migrate deploy --schema prisma/schema/schema.prisma

This is idempotent and safe for normal deploy flows.

## Verification checklist

After deployment, verify:

1. API health endpoint returns OK at /health.
2. Register and login work from web UI.
3. Authenticated requests include cookies and return 200.
4. CORS allows the exact WEB_ORIGIN value.

## Common pitfalls

- AUTH_JWT_SECRET missing in production causes API startup failure.
- Mismatched WEB_ORIGIN blocks credentialed requests.
- Wrong VITE_API_BASE_URL points web calls to the wrong API host.
