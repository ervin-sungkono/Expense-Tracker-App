# Xpensed

Xpensed is an offline-first, shared expense tracker. Google authentication and the hosted database use Supabase; the application remains deployable on Vercel's free tier.

## Security model

Supabase stores expense payloads as JSON. They are not application-encrypted, so project administrators and anyone with database access can read them.

Row Level Security is enabled on every application table. Database policy is the final authorization boundary:

- Admin: manages space metadata, categories, budgets, shops, invitations, and all transactions.
- Collaborator: reads the space and changes transactions only.
- Viewer: read-only.

The UI mirrors these permissions, but it is not relied upon for security.

## Supabase setup

1. Create a Supabase project.
2. In SQL Editor, apply the migrations in `supabase/migrations` in filename order. With a local Docker/Supabase CLI environment, use `npx supabase db reset`; for a linked project use `npx supabase db push`.
3. In Authentication → Providers → Google, enable Google and enter the Google OAuth client ID and secret.
4. In Google Cloud Console, add Supabase's callback URL shown on the Google provider page as an authorized redirect URI.
5. In Supabase Authentication → URL Configuration, set the Vercel production URL as Site URL and allow:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR_DOMAIN/auth/callback`
6. Confirm the private `space-assets` bucket exists after migration.

Never expose `SUPABASE_SECRET_KEY` through a `NEXT_PUBLIC_` variable. It is used only by server-side
invitation acceptance and public-share routes.

## Public sharing

Space admins can create a revocable public link from the Space & sharing page. Anyone holding the
link can view a sanitized, read-only snapshot containing the space summary, charts, budgets, and
recent transactions; authentication is not required. Notes, shops, members, and sync metadata are
never returned. The raw bearer token is shown only when a link is created or regenerated, while
Supabase stores only its SHA-256 hash. Regenerating a link immediately revokes the previous link.

## MCP integration

Xpensed exposes an authenticated remote MCP server for MCP-capable desktop applications, IDEs, and
local-LLM agent hosts. It supports bounded expense queries, user-authorized transaction and taxonomy
mutations, and structured Gmail imports without sending email bodies to Xpensed. See [Xpensed MCP
setup](docs/mcp.md), including the local LLM host connection guide and OAuth requirements.

The production endpoint is:

```text
https://xpensedv2.vercel.app/api/mcp
```

The server uses Streamable HTTP and Supabase OAuth 2.1. Clients must complete the browser-based OAuth
flow; never paste a Supabase access token or service key into an MCP configuration.

### Codex CLI

```bash
codex mcp add xpensed --url https://xpensedv2.vercel.app/api/mcp
codex mcp login xpensed
codex mcp list
```

After `codex mcp login`, approve the Xpensed consent screen in your browser. Codex stores the OAuth
credentials for the MCP server and can then use its `xpensed_*` tools.

### Claude Code

```bash
claude mcp add --transport http --scope user xpensed https://xpensedv2.vercel.app/api/mcp
claude mcp list
```

Start Claude Code, run `/mcp`, select `xpensed`, and complete the browser authentication flow. The
`--scope user` option makes the server available across projects; omit it for project-only setup.

If a CLI reports that the server needs authentication, use its MCP management command or UI to
authenticate. Xpensed does not support static bearer-token configuration.

## In-app assistant

Signed-in Google users can open the Xpensed Assistant from an active space. The assistant and MCP
server share the same validated expense-tool catalog. The in-app adapter uses the active UUID-based
Dexie context, queues approved changes in the normal outbox, and lets the existing sync flow send
them to Supabase under Row Level Security. It does not use the MCP OAuth token or MCP-only mutation
RPCs.

Conversation history stays in IndexedDB and is separated by user and space. Financial tool results
may be sent to Gemini when needed for a request; guest and offline sessions cannot use the assistant.
Every mutation requires an explicit confirmation, and user-authored tool data is treated as
untrusted content rather than instructions.

## Environment variables

Copy `.env.example` to `.env.local` for development and configure the same values in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
SUPABASE_SECRET_KEY=
GEMINI_API_KEY=
RESEND_API_KEY=
INVITE_FROM_EMAIL=
MCP_ALLOW_DIRECT_USER_TOKENS=false
RATE_LIMIT_SECRET=
```

`RESEND_API_KEY` and `INVITE_FROM_EMAIL` are optional. Without them, invitations still work and the owner copies the generated link. On Resend's free tier, configure a verified sender domain before relying on delivery.

`RATE_LIMIT_SECRET` must be a random server-only value of at least 32 characters. It is used to hash
rate-limit buckets and must be configured in every deployed environment. `MCP_ALLOW_DIRECT_USER_TOKENS`
should remain `false` in production so MCP access is limited to OAuth clients.

## How the app works

- The browser uses IndexedDB through Dexie as its offline working database. Writes and their sync
  outbox entries are committed together.
- Supabase is the synchronized source of truth. Row Level Security enforces space membership and
  admin, collaborator, and viewer permissions on the server.
- API routes authenticate the Supabase user, validate request sizes and origins, and use the shared
  distributed rate limiter before expensive or state-changing work.
- Public links expose a bounded, sanitized read-only snapshot. MCP exposes bounded tools over OAuth;
  returned user-authored text is treated as untrusted data, and writes require user intent or a
  narrowly scoped preauthorized workflow.
- The in-app assistant reuses the MCP tool contracts but executes against the active offline context;
  approved mutations enter the same Supabase sync and RLS path as ordinary UI changes.

## Local development and verification

```bash
npm install
npm run dev
npm test
npx tsc --noEmit
npm run build
```

When Docker and the Supabase CLI are installed, validate the complete database migration locally:

```bash
npx supabase start
npx supabase db reset
npx supabase db lint
```

Manual acceptance checks:

1. Sign in with Google and create a space.
2. Create records offline and confirm the sync indicator reports pending changes.
3. Reconnect, sync, and verify the record is stored in `space_records.payload`.
4. Invite a second Google account as viewer; verify it can read after accepting but cannot mutate through the UI or direct Supabase calls.
5. Repeat as collaborator; verify transaction changes succeed while category, shop, and budget changes fail.
6. Attempt to own a fourth space and confirm the database rejects it.
7. Create concurrent edits on two devices and confirm the local conflict store captures the version conflict instead of silently overwriting it.
8. Sign in from a fresh browser and confirm the selected space syncs from Supabase.
9. Start in guest mode, sign in with Google, and verify the migration dialog can import into an
   admin space, create a private space when fewer than three are owned, defer the decision, or
   permanently discard only the guest namespace.

For an existing production database, apply every newer migration in `supabase/migrations` in
filename order from the Supabase SQL Editor. The MCP surface requires
`20260810000000_mcp_transaction_mutations.sql` and `20260810000001_mcp_taxonomy_mutations.sql`.

## Offline behavior

IndexedDB is the working database. Every local write and its outbox entry are committed atomically. Sync uses one lock per user/space, pulls by monotonic server revision, pushes mutation groups with optimistic base versions, and pulls again. Deletes are tombstones on the server so other devices receive them.

## Operational notes

- Invitation links expire after seven days and are bound to the exact invited Google email.
- Invitation tokens are stored as hashes and are not included in database rows as plaintext.
- Clearing browser storage removes only that device's offline copy; synced data remains in Supabase.
- Back up Supabase normally because it contains the readable source of truth for synchronized records.
- Keep the service key only in Vercel server environment variables and rotate it if it leaks.
