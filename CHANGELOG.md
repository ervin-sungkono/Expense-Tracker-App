# Changelog

This file tracks committed changes that exist on `experiment-firebase` but are not present on
`master`. The comparison contains 33 commits through `e457feb`; uncommitted working-tree changes
are intentionally excluded.

## Summary

- Migrated the application from JavaScript to TypeScript and standardized formatting, build, and
  test configuration.
- Added the Supabase-backed shared-space model, authenticated offline sync, roles, invitations, and
  production migration alignment.
- Improved onboarding, space management, transaction views, navigation, category seeding, and
  synchronization behavior.
- Added read-only public space links with sanitized snapshots, revocation, and regression tests.
- Added the authenticated Xpensed MCP server with OAuth, Gmail expense import, prompt-injection
  safeguards, rate limits, request validation, and developer setup documentation.
- Added API hardening for image extraction and invitation routes, including request limits and
  safer error handling.

## Commit tracking (`master..experiment-firebase`)

### Platform and data foundation

- `83254fd` — Added the encrypted Supabase data model and backend foundation.
- `bd5e4df` — Added authenticated offline space synchronization.
- `1e9ab6a` — Added shared-space roles and invitations.
- `4fe85b6` — Documented secure deployment and recovery procedures.
- `a2a802d` — Aligned database migrations and added indexes.
- `0105d26` — Aligned Supabase migration history.
- `e6cca0a` — Updated production Supabase redirect URLs.
- `f309389` — Simplified onboarding encryption setup and redirects.
- `8cdad0d` — Removed recovery passphrase encryption support.
- `45f303b` — Simplified space encryption and sync setup.
- `2295277` — Aligned the production Supabase migration history.
- `3ff6df7` — Removed application-level sync encryption.
- `63b614f` — Removed obsolete migration scripts.

### Product behavior and maintenance

- `785cece` — Fixed a missing graph effect dependency.
- `1f4bc2e` — Fixed budget rendering.
- `a5ddfd7` — Published version 1.1.0.
- `6c313a4` — Updated Next.js.
- `1819a75` — Formatted the codebase with Prettier.
- `2492cc5` — Added the first-space home state.
- `d2ab1e8` — Refined the action bar UI.
- `b0936a5` — Added core tests and refined space views.
- `a61ea04` — Fixed synchronization behavior.
- `e6d9dbc` — Prevented category reseeding on every admin login.
- `a042dc8` — Migrated the codebase from JavaScript to TypeScript.
- `db6cd72` — Added space-member management.
- `670b0e3` — Refined the member actions menu.
- `36f1118` — Fixed member actions menu positioning.
- `c522971` — Fixed the space-management layout.
- `e457feb` — Fixed the public-share view layout.

### Security, public sharing, and MCP

- `af263a4` — Added distributed API rate limiting, body/origin validation, image extraction
  hardening, and safer invitation errors.
- `1ded272` — Added revocable public share links, sanitized read-only snapshots, public-share UI,
  RLS policies, and tests.
- `62e4028` — Added the authenticated Xpensed MCP server, OAuth consent flow, bounded tools,
  Gmail import support, prompt-injection protections, documentation, and database integration.
- `19171cd` — Updated the Supabase schema script and consolidated the MCP database definitions into
  the initial schema.

