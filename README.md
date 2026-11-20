# Website Factory

Private full-stack operations dashboard for creating, validating, monitoring, and publishing US Loans Education & Referral websites through a server-side **LocalSites.pro MCP** adapter.

## Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4 (Light & Dark themes)
- **Backend:** Node.js (v22+), Express, `@modelcontextprotocol/sdk` (HTTP/SSE & Stdio transports)
- **Database:** PostgreSQL (`pg`) — compatible with Neon, Supabase, RDS, or self-hosted Postgres

## Local Development

1. Copy `.env.example` to `.env` and fill in your PostgreSQL connection string:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the unified dev server on port `3000`:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`. If `OWNER_PASSCODE` is not set in `.env`, the first-launch screen will prompt you to create your master passcode (stored as a salted `scrypt` hash in PostgreSQL).

## Production & Independent Deployment

1. Build the frontend bundle:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   NODE_ENV=production npm start
   ```

### Required Environment Variables

- `DATABASE_URL` (or `DATABASE_URL_POOLED`): PostgreSQL connection string
- `OWNER_PASSCODE` *(optional)*: Master passcode override; if omitted, managed in PostgreSQL via UI setup/settings
- `SESSION_SECRET` *(optional)*: HMAC signing key for HTTP-only session cookies
- `LOCALSITES_MCP_TRANSPORT`: `demo` (default), `http_sse`, or `stdio`
- `LOCALSITES_MCP_URL` / `LOCALSITES_MCP_API_KEY`: Used when transport is `http_sse`
- `LOCALSITES_MCP_STDIO_COMMAND` / `LOCALSITES_MCP_STDIO_ARGS`: Used when transport is `stdio`
- `PORT`: Defaults to `3000`
