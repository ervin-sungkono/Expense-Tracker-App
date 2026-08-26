# Xpensed

Xpensed is a personal expense tracker built as an installable, offline-first PWA. It keeps the main finance data in the browser and provides dashboards for understanding spending.

## Features

- Dashboard with balances, transaction reports, charts, recent transactions, categories, and shops
- Transaction management with search, filters, categories, shops, notes, dates, income/expense types, and image-assisted entry
- Hierarchical category management, including custom icons and category merging
- Shop management
- Budget management with active, finished, upcoming, and repeat settings
- Import and export of the local Dexie database as JSON
- Light, dark, and system theme support
- Installable PWA with an offline fallback page
- Local agent chat powered by Gemini, with streamed Markdown responses and browser-executed tools for reading or changing transactions, categories, and shops

## Data and privacy

The transaction, category, shop, budget, and assistant-session data is stored in the browser with IndexedDB through Dexie. The app does not use a remote application database. The onboarding name and UI preferences use browser storage.

When the assistant is used, the current conversation and the local tool results needed for the turn are sent through the Gemini API. Assistant mutations are previewed and require approval unless the user has enabled “Allow changes”. Uploaded transaction images are also sent to the image-extraction endpoint for processing.

Transaction amounts are formatted and interpreted as Indonesian rupiah (IDR).

## Requirements

- Node.js and npm
- A Gemini API key for the assistant and image extraction features

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env.local
   ```

   Set `GEMINI_API_KEY` in `.env.local`. `JWT_SECRET` is used by the legacy `/api/encode` and `/api/decode` routes.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run the configured Next.js lint command |

## Assistant architecture

The assistant UI is mounted from the root layout and calls `POST /api/assistant`. That route streams Gemini output and exposes the Xpensed tool declarations. Tool execution remains in the browser through the local assistant dispatcher, so the browser remains the authority over the IndexedDB data.

The available assistant tools cover:

- Listing categories, shops, and transactions
- Reading one transaction or matching a shop
- Creating, updating, and deleting transactions, categories, and shops

The client limits a turn to six tool rounds, validates tool input, formats mutation previews for end users, and writes approved changes to IndexedDB. If the primary Gemini model is rate-limited before it emits text, the API retries with a fallback model.

## Project structure

```text
app/
├── _components/       UI components and feature views
├── _lib/              Dexie database, utilities, validation, and assistant tools
├── api/               Gemini, image extraction, and encode/decode route handlers
├── page.tsx            Onboarding entry point
├── home/              Dashboard
├── offline/            Offline fallback page
├── register/          Local onboarding
├── settings/          Import/export, themes, categories, and app settings
├── shops/             Shop list
└── transactions/      Transaction list
public/                PWA assets and category icons
next.config.mjs        Next PWA configuration
```

## Deployment

Build the app with `npm run build` and run it with `npm run start`. Configure the environment variables from `.env.example` in the deployment environment. The PWA service worker is disabled during development and enabled for production builds.
