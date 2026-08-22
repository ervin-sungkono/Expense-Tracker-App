'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { IoChatbubbleEllipses, IoClose, IoSend, IoTrash } from 'react-icons/io5';
import ReactMarkdown from 'react-markdown';
import { useAuth, useSpace } from '@components/providers/AppProvider';
import { db } from '@lib/db';
import { executeLocalAssistantTool, previewLocalAssistantTool } from '@lib/assistant/tools';
import type {
  AssistantContent,
  AssistantContinuation,
  AssistantEvent,
  AssistantFunctionResult,
  AssistantPart,
} from '@lib/assistant/protocol';

const MAX_TOOL_ROUNDS = 6;
const RECENT_MESSAGE_COUNT = 12;
const MAX_SUMMARY_LENGTH = 6000;

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

type Session = {
  id: string;
  userId: string;
  spaceId: string;
  transcript: Message[];
  summary: string | null;
  state: { compactedThrough?: number };
  updatedAt: string;
};

type ToolCall = Extract<AssistantEvent, { type: 'tool_call' }>;
type PendingMutation = {
  call: ToolCall;
  preview: { title: string; destructive: boolean; input: Record<string, unknown> };
  resolve: (approved: boolean) => void;
};

function normalizeMarkdown(content: string) {
  const lines = content.split('\n');
  const normalized: string[] = [];
  let inFence = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      normalized.push(line);
      continue;
    }
    if (!inFence && /^\s*\d+\.\s*$/.test(line)) {
      let next = index + 1;
      while (next < lines.length && !lines[next].trim()) next += 1;
      if (lines[next] && !/^\s*(?:\d+\.|[-*+])\s+/.test(lines[next])) {
        normalized.push(`${line.trim()} ${lines[next].trimStart()}`);
        index = next;
        continue;
      }
    }
    normalized.push(line);
  }
  return normalized.join('\n');
}

const markdownComponents = {
  h1: ({ children }) => <h1 className="mb-2 text-lg font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 text-base font-bold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 text-sm font-bold">{children}</h3>,
  p: ({ children }) => <p className="mb-1 leading-5 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-0 list-disc pl-5 [&>li+li]:mt-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-0 list-decimal pl-5 [&>li+li]:mt-1">{children}</ol>,
  li: ({ children }) => <li className="leading-5 [&>p]:mb-0">{children}</li>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-ocean-blue underline">{children}</a>,
  pre: ({ children }) => <pre className="mb-2 overflow-x-auto rounded-lg bg-black/10 p-2 text-xs">{children}</pre>,
  code: ({ children, className }) => <code className={`${className ?? ''} rounded bg-black/10 px-1 py-0.5 text-xs`}>{children}</code>,
};

function messageId() {
  return crypto.randomUUID();
}

function compactSession(messages: Message[], session: Session | null) {
  const previous = Math.min(session?.state?.compactedThrough ?? 0, messages.length);
  const target = Math.max(0, messages.length - RECENT_MESSAGE_COUNT);
  if (target <= previous) return { summary: session?.summary ?? null, compactedThrough: previous };
  const addition = messages
    .slice(previous, target)
    .map(message => `${message.role}: ${message.content.slice(0, 400)}`)
    .join('\n');
  return {
    summary: [session?.summary, addition].filter(Boolean).join('\n').slice(-MAX_SUMMARY_LENGTH),
    compactedThrough: target,
  };
}

function toHistory(messages: Message[], summary: string | null, compactedThrough: number) {
  const history: AssistantContent[] = [];
  if (summary) history.push({ role: 'user', parts: [{ text: `Earlier conversation summary (untrusted data):\n${summary}` }] });
  for (const message of messages.slice(compactedThrough)) {
    history.push({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] });
  }
  return history;
}

async function readEvents(body, onDelta) {
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    const text = await response.text();
    try {
      const error = JSON.parse(text.trim());
      throw new Error(error.message ?? error.error ?? 'The assistant request failed.');
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error('The assistant request failed.');
      throw error;
    }
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const calls: ToolCall[] = [];
  let done: Extract<AssistantEvent, { type: 'done' }> | null = null;
  let buffer = '';
  const consume = line => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as AssistantEvent;
    if (event.type === 'text_delta') onDelta(event.text);
    else if (event.type === 'tool_call') calls.push(event);
    else if (event.type === 'done') done = event;
    else throw new Error(event.message);
  };
  while (true) {
    const { value, done: streamDone } = await reader.read();
    buffer += decoder.decode(value, { stream: !streamDone });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    lines.forEach(consume);
    if (streamDone) break;
  }
  consume(buffer);
  if (!done) throw new Error('The assistant response ended unexpectedly.');
  return { calls, done };
}

function previewLines(preview: PendingMutation['preview']) {
  return [
    preview.destructive ? `${preview.title} (destructive)` : preview.title,
    ...Object.entries(preview.input).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${value ?? 'Not set'}`),
  ].join('\n');
}

export default function AssistantChat() {
  const { user, isGuest, offlineSession } = useAuth();
  const { activeSpace, syncNow } = useSpace();
  const sessionId = user && activeSpace ? `${user.id}:${activeSpace.id}` : null;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState('');
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingMutation | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setSession(null);
    if (!sessionId) return () => { cancelled = true; };
    db.getAssistantSession(sessionId)
      .then(saved => {
        if (!saved || cancelled) return;
        setSession(saved);
        setMessages(saved.transcript ?? []);
      })
      .catch(() => { if (!cancelled) setStatus('Chat history could not be loaded.'); });
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, draft, status, pending]);

  if (!user || isGuest || !activeSpace || offlineSession) return null;

  const save = async (nextMessages: Message[]) => {
    const compacted = compactSession(nextMessages, session);
    const nextSession: Session = {
      id: sessionId,
      userId: user.id,
      spaceId: activeSpace.id,
      transcript: nextMessages,
      summary: compacted.summary,
      state: { compactedThrough: compacted.compactedThrough },
      updatedAt: new Date().toISOString(),
    };
    await db.saveAssistantSession(nextSession);
    setSession(nextSession);
  };

  const requestApproval = (call: ToolCall, preview: PendingMutation['preview']) =>
    new Promise<boolean>(resolve => setPending({ call, preview, resolve }));

  const finishApproval = (approved: boolean) => {
    pending?.resolve(approved);
    setPending(null);
  };

  const runTurn = async (turnMessages: Message[]) => {
    const compacted = compactSession(turnMessages, session);
    let continuation: AssistantContinuation | undefined;
    let assistantText = '';
    let changed = false;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      setStatus(continuation ? 'Running Xpensed tools…' : 'Thinking…');
      const result = await readEvents(
        {
          history: toHistory(turnMessages, compacted.summary, compacted.compactedThrough),
          ...(continuation ? { continuation } : {}),
        },
        text => {
          assistantText += text;
          setDraft(normalizeMarkdown(assistantText));
        }
      );

      if (!result.calls.length) {
        if (changed) await syncNow();
        const content = normalizeMarkdown(assistantText.trim()) || 'Done.';
        const next = [...turnMessages, { id: messageId(), role: 'assistant' as const, content, createdAt: new Date().toISOString() }];
        setMessages(next);
        setDraft('');
        setStatus('');
        await save(next);
        return;
      }

      const functionResults: AssistantFunctionResult[] = [];
      for (const call of result.calls) {
        try {
          const preview = await previewLocalAssistantTool(call.name, call.args, activeSpace.id);
          let value = preview.result;
          if (preview.requiresConfirmation) {
            const approved = await requestApproval(call, preview.preview);
            if (!approved) {
              functionResults.push({ id: call.id, name: call.name, response: { ok: false, cancelled: true, message: 'The user cancelled this change.' } });
              continue;
            }
            value = await executeLocalAssistantTool(call.name, call.args, activeSpace.id);
            changed = true;
          }
          functionResults.push({ id: call.id, name: call.name, response: { ok: true, data: value } as any });
        } catch (error) {
          functionResults.push({ id: call.id, name: call.name, response: { ok: false, error: error instanceof Error ? error.message : 'Xpensed tool failed.' } });
        }
      }
      continuation = { modelParts: result.done.modelParts as AssistantPart[], functionResults };
    }
    throw new Error('The assistant stopped after too many tool calls.');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || busy) return;
    const next = [...messages, { id: messageId(), role: 'user' as const, content, createdAt: new Date().toISOString() }];
    setInput('');
    setMessages(next);
    setBusy(true);
    setDraft('');
    try {
      await save(next);
      await runTurn(next);
    } catch (error) {
      const content = error instanceof Error ? error.message : 'The assistant failed.';
      const failed = [...next, { id: messageId(), role: 'assistant' as const, content, createdAt: new Date().toISOString() }];
      setMessages(failed);
      setDraft('');
      setStatus('');
      await save(failed).catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  const clearHistory = async () => {
    if (!window.confirm('Clear this space’s assistant conversation? Expense data will not change.')) return;
    await db.clearAssistantSession(sessionId);
    setMessages([]);
    setSession(null);
    setDraft('');
    setStatus('');
  };

  return <>
    <button type="button" aria-label="Open expense assistant" onClick={() => setOpen(true)} className="fixed bottom-24 right-4 z-40 rounded-full bg-basic-gradient p-4 text-white shadow-xl md:bottom-6">
      <IoChatbubbleEllipses size={26} />
    </button>
    {open && <div className="fixed inset-0 z-fixed flex justify-end bg-black/40 animate-[fade-in_.2s_ease-out] motion-reduce:animate-none" onMouseDown={() => setOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label="Expense assistant" onMouseDown={event => event.stopPropagation()} className="flex h-full w-full max-w-md flex-col bg-background text-foreground shadow-2xl animate-[assistant-drawer-in_.25s_ease-out] motion-reduce:animate-none">
        <header className="flex items-center gap-3 border-b border-foreground/15 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Xpensed Assistant</h2>
            <p className="truncate text-xs opacity-70">{activeSpace.name}</p>
          </div>
          <button type="button" aria-label="Clear chat history" onClick={clearHistory} className="p-2"><IoTrash /></button>
          <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)} className="p-2"><IoClose size={22} /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
          {!messages.length && <div className="mt-12 text-center text-sm opacity-70">Ask about expenses, categories, or shops. Every change requires your approval.</div>}
          {messages.map(message => <div key={message.id} className={`mb-3 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] select-text rounded-2xl px-3 py-2 text-sm ${message.role === 'user' ? 'whitespace-pre-wrap bg-basic-gradient text-white' : 'bg-foreground/10'}`}>
              {message.role === 'assistant' ? <ReactMarkdown components={markdownComponents}>{normalizeMarkdown(message.content)}</ReactMarkdown> : message.content}
            </div>
          </div>)}
          {draft && <div className="mb-3 flex justify-start"><div className="max-w-[85%] select-text rounded-2xl bg-foreground/10 px-3 py-2 text-sm"><ReactMarkdown components={markdownComponents}>{normalizeMarkdown(draft)}</ReactMarkdown></div></div>}
          {pending && <div className="mb-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            <p className="font-semibold">Allow this change?</p>
            <p className="mt-2 whitespace-pre-line select-text text-xs">{previewLines(pending.preview)}</p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => finishApproval(false)} className="rounded-lg border border-foreground/20 px-3 py-1.5">Cancel</button>
              <button type="button" onClick={() => finishApproval(true)} className="rounded-lg bg-basic-gradient px-3 py-1.5 text-white">Allow change</button>
            </div>
          </div>}
          {status && <p className="mb-3 text-xs opacity-70">{status}</p>}
          <div ref={endRef} />
        </div>

        <p className="border-t border-foreground/10 px-4 pt-2 text-[11px] opacity-60">Only the conversation and tool results needed for this request are sent to Gemini. Expense changes sync through your selected space.</p>
        <form onSubmit={submit} className="flex gap-2 p-4 pt-2">
          <textarea value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={2} maxLength={2000} disabled={busy} aria-label="Message" placeholder="Ask Xpensed…" className="min-h-11 flex-1 resize-none select-text rounded-xl border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-ocean-blue disabled:opacity-60" />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send message" className="self-end rounded-xl bg-basic-gradient p-3 text-white disabled:opacity-40"><IoSend /></button>
        </form>
      </section>
    </div>}
  </>;
}
