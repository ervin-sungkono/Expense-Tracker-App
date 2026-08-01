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

Never expose `SUPABASE_SECRET_KEY` through a `NEXT_PUBLIC_` variable. It is used only by the invitation acceptance server route.

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
```

`RESEND_API_KEY` and `INVITE_FROM_EMAIL` are optional. Without them, invitations still work and the owner copies the generated link. On Resend's free tier, configure a verified sender domain before relying on delivery.

## Local development and verification

```bash
npm install
npm run dev
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

## Offline behavior

IndexedDB is the working database. Every local write and its outbox entry are committed atomically. Sync uses one lock per user/space, pulls by monotonic server revision, pushes mutation groups with optimistic base versions, and pulls again. Deletes are tombstones on the server so other devices receive them.

## Operational notes

- Invitation links expire after seven days and are bound to the exact invited Google email.
- Invitation tokens are stored as hashes and are not included in database rows as plaintext.
- Clearing browser storage removes only that device's offline copy; synced data remains in Supabase.
- Back up Supabase normally because it contains the readable source of truth for synchronized records.
- Keep the service key only in Vercel server environment variables and rotate it if it leaks.
