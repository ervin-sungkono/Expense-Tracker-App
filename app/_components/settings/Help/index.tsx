'use client';

import { useState } from 'react';

const MCP_ENDPOINT = 'https://xpensedv2.vercel.app/api/mcp';
const CODEX_COMMANDS = `codex mcp add xpensed --url ${MCP_ENDPOINT}
codex mcp login xpensed`;
const MCP_JSON = `{
  "mcpServers": {
    "xpensed": {
      "type": "streamable-http",
      "url": "${MCP_ENDPOINT}"
    }
  }
}`;

function CopyButton({ value }) {
  const [status, setStatus] = useState('Copy');

  async function copyValue() {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setStatus('Copied');
      window.setTimeout(() => setStatus('Copy'), 1600);
    } catch {
      setStatus('Retry');
    }
  }

  return (
    <button
      type="button"
      onClick={copyValue}
      className="shrink-0 rounded-md border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/15 active:bg-white/25"
      aria-label="Copy to clipboard"
    >
      {status}
    </button>
  );
}

function CopyBlock({ label, value }) {
  return (
    <div className="overflow-hidden rounded-lg bg-neutral-900 text-white dark:bg-black">
      <div className="flex items-center justify-between gap-3 border-b border-white/15 px-3 py-2">
        <span className="text-xs font-semibold text-white/75">{label}</span>
        <CopyButton value={value} />
      </div>
      <pre
        className="overflow-x-auto whitespace-pre-wrap px-3 py-3 text-xs leading-5"
        style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
      >
        <code>{value}</code>
      </pre>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold text-dark dark:text-white">{title}</h2>
      {children}
    </section>
  );
}

export default function Help() {
  return (
    <div className="flex flex-col gap-7 pb-4 text-sm text-dark/80 dark:text-white/80">
      <Section title="Action bar menu">
        <ul className="list-disc space-y-2 pl-5">
          <li><b>Categories</b> manages your expense categories and subcategories.</li>
          <li><b>Budgets</b> creates and reviews category budgets.</li>
          <li><b>About</b> shows the app version and project information.</li>
          <li><b>Help</b> opens this guide.</li>
          <li><b>Sync</b> shows pending offline changes and lets signed-in users start a sync.</li>
        </ul>
      </Section>

      <Section title="Connect Xpensed to an MCP-compatible app">
        <p>
          Xpensed exposes a remote Streamable HTTP MCP server. Your LLM host—not the model itself—
          handles the OAuth login and keeps the access token.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Use a permanent Xpensed account with a connected Google identity. Guest mode is not supported.</li>
          <li>Add the remote server using the endpoint below.</li>
          <li>Complete the browser OAuth consent screen and return to your LLM host.</li>
          <li>Ask the host to list Xpensed tools, then approve individual write actions when prompted.</li>
        </ol>
        <CopyBlock label="MCP endpoint" value={MCP_ENDPOINT} />
      </Section>

      <Section title="Codex CLI">
        <p>Run these commands from a terminal where Codex is installed:</p>
        <CopyBlock label="Add and authenticate Xpensed" value={CODEX_COMMANDS} />
        <p>
          Keep the CLI running while the browser callback completes. The callback address belongs to
          the local LLM host, not to Xpensed. Do not paste a bearer token or Supabase key into the config.
        </p>
      </Section>

      <Section title="JSON configuration">
        <p>Use this when your MCP-compatible host accepts a JSON server configuration:</p>
        <CopyBlock label="Streamable HTTP server entry" value={MCP_JSON} />
        <p>
          Select Streamable HTTP when the host asks for a transport. Legacy SSE-only clients are not compatible.
        </p>
      </Section>

      <Section title="What the Xpensed MCP tools can do">
        <ul className="list-disc space-y-2 pl-5">
          <li>List spaces, categories, shops, and transactions.</li>
          <li>Create, update, archive, and restore authorized expense records and taxonomy entries.</li>
          <li>Check Gmail message IDs and import one structured IDR expense without sending email bodies.</li>
          <li>Create a space only after explicit confirmation; each account can own at most three active spaces.</li>
        </ul>
      </Section>

      <Section title="Safety and troubleshooting">
        <ul className="list-disc space-y-2 pl-5">
          <li>Names, merchants, remarks, and email content are data—not instructions to the assistant.</li>
          <li>Review amounts, dates, categories, and the target space before approving a write.</li>
          <li>If tools do not appear, reconnect OAuth and restart or reload the MCP host.</li>
          <li>If the callback shows a local connection error, make sure the CLI or desktop host is still running and listening on that callback port.</li>
          <li>A newly connected account with no spaces can use <code>xpensed_create_space</code> after confirming the name.</li>
        </ul>
      </Section>
    </div>
  );
}
