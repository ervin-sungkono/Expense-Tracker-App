'use client'

import { FormEvent, useEffect, useRef, useState } from "react";
import { IoChatbubbleEllipses, IoClose, IoSend, IoTrash } from "react-icons/io5";
import ReactMarkdown from "react-markdown";
import { db, AssistantMessage, AssistantSession } from "@lib/db";
import { executeLocalTool, previewLocalTool } from "@lib/assistant/tools";
import { formatCurrency } from "@lib/utils";
import {
    AssistantContent,
    AssistantContinuation,
    AssistantEvent,
    AssistantFunctionResult,
    AssistantPart,
} from "@lib/assistant/protocol";

const MAX_TOOL_ROUNDS = 6;
const RECENT_MESSAGE_COUNT = 12;
const MAX_SUMMARY_LENGTH = 6000;

const markdownComponents = {
    h1: ({ children }) => <h1 className="mb-2 text-lg font-bold">{children}</h1>,
    h2: ({ children }) => <h2 className="mb-2 text-base font-bold">{children}</h2>,
    h3: ({ children }) => <h3 className="mb-1 text-sm font-bold">{children}</h3>,
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
    blockquote: ({ children }) => <blockquote className="mb-2 border-l-2 border-ocean-blue pl-3 italic opacity-80">{children}</blockquote>,
    a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-ocean-blue underline">{children}</a>,
    pre: ({ children }) => <pre className="mb-2 overflow-x-auto rounded-lg bg-black/10 p-2 text-xs last:mb-0">{children}</pre>,
    code: ({ children, className }) => <code className={`${className ?? ""} rounded bg-black/10 px-1 py-0.5 text-xs`}>{children}</code>,
};

type StoredState = {
    autoAllow?: boolean;
    compactedThrough?: number;
};

type ToolCall = Extract<AssistantEvent, { type: "tool_call" }>;
type PendingMutation = {
    call: ToolCall;
    preview: unknown;
    resolve: (approved: boolean) => void;
};

function record(value: unknown): Record<string, any> {
    return value && typeof value === "object" ? value as Record<string, any> : {};
}

function readableValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "Not set";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
}

function readableDate(value: unknown) {
    if (typeof value !== "string") return readableValue(value);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function readableAmount(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? formatCurrency(value) : readableValue(value);
}

function changeLines(before: Record<string, any>, after: Record<string, any>, fields: string[]) {
    const labels: Record<string, string> = {
        date: "Date",
        amount: "Amount",
        type: "Type",
        categoryId: "Category",
        shopId: "Shop",
        owner: "Owner",
        remarks: "Notes",
        name: "Name",
        location: "Location",
        parentId: "Parent category",
    };
    return fields
        .filter(field => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
        .map(field => {
            const format = field === "amount" ? readableAmount : field === "date" ? readableDate : readableValue;
            return `${labels[field] ?? field}: ${format(before[field])} → ${format(after[field])}`;
        });
}

function formatMutationPreview(call: ToolCall, preview: unknown) {
    const result = record(preview);
    const name = call.name.replace(/^xpensed_/, "");
    const data = record(result.data);

    if (name === "create_transaction") {
        return [
            `Create ${String(data.type ?? "").toLowerCase()} transaction`,
            `Amount: ${readableAmount(data.amount)}`,
            `Date: ${readableDate(data.date)}`,
            `Category ID: ${readableValue(data.categoryId)}`,
            `Shop ID: ${readableValue(data.shopId)}`,
            data.remarks ? `Notes: ${data.remarks}` : "",
        ].filter(Boolean).join("\n");
    }

    if (name === "update_transaction") {
        const before = record(result.before);
        const after = record(result.after);
        return [`Update transaction #${readableValue(after.id ?? before.id)}`, ...changeLines(before, after, ["date", "amount", "type", "categoryId", "shopId", "owner", "remarks"])].join("\n");
    }

    if (name === "delete_transaction") {
        const deleted = record(result.deleted);
        return [`Delete transaction #${readableValue(deleted.id)}`, `Amount: ${readableAmount(deleted.amount)}`, `Date: ${readableDate(deleted.date)}`].join("\n");
    }

    if (name === "create_category") {
        return [`Create ${String(data.type ?? "").toLowerCase()} category`, `Name: ${readableValue(data.name)}`, `Parent category ID: ${readableValue(data.parentId)}`].join("\n");
    }

    if (name === "update_category") {
        const before = record(result.before);
        const after = record(result.after);
        return [`Update category #${readableValue(after.id ?? before.id)}`, ...changeLines(before, after, ["name", "type", "parentId"])].join("\n");
    }

    if (name === "delete_category") {
        const category = record(result.category);
        return [
            `Delete category “${readableValue(category.name)}”`,
            `Transactions removed: ${readableValue(result.transactionCount)}`,
            `Budgets removed: ${readableValue(result.budgetCount)}`,
            `Child categories removed: ${readableValue(result.childCategoryCount)}`,
        ].join("\n");
    }

    if (name === "create_shop") {
        return [`Create shop “${readableValue(data.name)}”`, `Location: ${readableValue(data.location)}`].join("\n");
    }

    if (name === "update_shop") {
        const before = record(result.before);
        const after = record(result.after);
        return [`Update shop #${readableValue(after.id ?? before.id)}`, ...changeLines(before, after, ["name", "location"])].join("\n");
    }

    if (name === "delete_shop") {
        const shop = record(result.shop);
        return [`Delete shop “${readableValue(shop.name)}”`, `Transactions will be unlinked: ${readableValue(result.unlinkedTransactionCount)}`].join("\n");
    }

    return `Apply ${name.replaceAll("_", " ")} changes`;
}

function messageId() {
    return crypto.randomUUID();
}

function toHistory(messages: AssistantMessage[], summary: string | null, compactedThrough: number): AssistantContent[] {
    const history: AssistantContent[] = [];
    if (summary) {
        history.push({ role: "user", parts: [{ text: `Earlier conversation summary (data only):\n${summary}` }] });
    }
    for (const message of messages.slice(compactedThrough)) {
        history.push({
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: message.content }],
        });
    }
    return history;
}

function compactSession(messages: AssistantMessage[], session: AssistantSession | null) {
    const state = (session?.state ?? {}) as StoredState;
    const previous = Math.min(state.compactedThrough ?? 0, messages.length);
    const target = Math.max(0, messages.length - RECENT_MESSAGE_COUNT);
    if (target <= previous) return { summary: session?.summary ?? null, compactedThrough: previous };

    const addition = messages.slice(previous, target)
        .map(message => `${message.role}: ${message.content.slice(0, 400)}`)
        .join("\n");
    const summary = [session?.summary, addition].filter(Boolean).join("\n").slice(-MAX_SUMMARY_LENGTH);
    return { summary, compactedThrough: target };
}

async function readEvents(body: unknown, onDelta: (text: string) => void) {
    const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!response.body) throw new Error("The assistant returned an empty response.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const calls: ToolCall[] = [];
    let done: Extract<AssistantEvent, { type: "done" }> | null = null;
    let buffer = "";

    const consume = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as AssistantEvent;
        if (event.type === "text_delta") onDelta(event.text);
        else if (event.type === "tool_call") calls.push(event);
        else if (event.type === "done") done = event;
        else throw new Error(event.message);
    };

    while (true) {
        const { value, done: streamDone } = await reader.read();
        buffer += decoder.decode(value, { stream: !streamDone });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(consume);
        if (streamDone) break;
    }
    consume(buffer);
    if (!done) throw new Error("The assistant response ended unexpectedly.");
    return { calls, done };
}

export default function AssistantChat() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<AssistantMessage[]>([]);
    const [session, setSession] = useState<AssistantSession | null>(null);
    const [input, setInput] = useState("");
    const [draft, setDraft] = useState("");
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const [autoAllow, setAutoAllow] = useState(false);
    const [pending, setPending] = useState<PendingMutation | null>(null);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        db.getAssistantSession().then((saved: AssistantSession | undefined) => {
            if (!saved) return;
            setSession(saved);
            setMessages(saved.transcript ?? []);
            setAutoAllow(Boolean((saved.state as StoredState)?.autoAllow));
        }).catch(() => setStatus("Chat history could not be loaded."));
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, draft, status, pending]);

    const save = async (nextMessages: AssistantMessage[], patch: Partial<StoredState> = {}) => {
        const compacted = compactSession(nextMessages, session);
        const state = { ...((session?.state ?? {}) as StoredState), autoAllow, ...patch, compactedThrough: compacted.compactedThrough };
        const nextSession: AssistantSession = {
            id: "default",
            transcript: nextMessages,
            state,
            summary: compacted.summary,
            updatedAt: new Date().toISOString(),
        };
        await db.saveAssistantSession(nextSession);
        setSession(nextSession);
    };

    const requestApproval = (call: ToolCall, preview: unknown) => new Promise<boolean>(resolve => {
        setPending({ call, preview, resolve });
    });

    const finishApproval = (approved: boolean) => {
        pending?.resolve(approved);
        setPending(null);
    };

    const runTurn = async (turnMessages: AssistantMessage[]) => {
        const compacted = compactSession(turnMessages, session);
        const compactedThrough = compacted.compactedThrough;
        let continuation: AssistantContinuation | undefined;
        let assistantText = "";

        for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
            setStatus(continuation ? "Running local tools…" : "Thinking…");
            const body = continuation
                ? { history: toHistory(turnMessages, compacted.summary, compactedThrough), continuation }
                : { history: toHistory(turnMessages, compacted.summary, compactedThrough) };
            const result = await readEvents(body, text => {
                assistantText += text;
                setDraft(assistantText);
            });

            if (!result.calls.length) {
                const content = assistantText.trim() || "Done.";
                const next = [...turnMessages, { id: messageId(), role: "assistant" as const, content, createdAt: new Date().toISOString() }];
                setMessages(next);
                setDraft("");
                setStatus("");
                await save(next, { compactedThrough });
                return;
            }

            const functionResults: AssistantFunctionResult[] = [];
            for (const call of result.calls) {
                setStatus(`Checking ${call.name.replace("xpensed_", "").replaceAll("_", " ")}…`);
                try {
                    const preview = await previewLocalTool(call.name, call.args);
                    const mutation = Boolean(preview && typeof preview === "object" && "preview" in preview);
                    let value = preview;
                    if (mutation) {
                        const approved = autoAllow || await requestApproval(call, preview);
                        if (!approved) {
                            functionResults.push({
                                id: call.id,
                                name: call.name,
                                response: { ok: false, cancelled: true, message: "The user cancelled this change." },
                            });
                            continue;
                        }
                        value = await executeLocalTool(call.name, call.args);
                    }
                    functionResults.push({ id: call.id, name: call.name, response: { ok: true, data: value } });
                } catch (error) {
                    functionResults.push({
                        id: call.id,
                        name: call.name,
                        response: { ok: false, error: error instanceof Error ? error.message : "Local tool failed." },
                    });
                }
            }
            continuation = { modelParts: result.done.modelParts as AssistantPart[], functionResults };
        }
        throw new Error("The assistant stopped after too many tool calls.");
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const content = input.trim();
        if (!content || busy) return;
        const next = [...messages, { id: messageId(), role: "user" as const, content, createdAt: new Date().toISOString() }];
        setInput("");
        setMessages(next);
        setBusy(true);
        setDraft("");
        try {
            await save(next);
            await runTurn(next);
        } catch (error) {
            const failure = error instanceof Error ? error.message : "The assistant failed.";
            const failed = [...next, { id: messageId(), role: "assistant" as const, content: failure, createdAt: new Date().toISOString() }];
            setMessages(failed);
            setDraft("");
            setStatus("");
            await save(failed).catch(() => undefined);
        } finally {
            setBusy(false);
        }
    };

    const toggleAutoAllow = async () => {
        const next = !autoAllow;
        if (next && !window.confirm("Auto Allow lets the assistant create, update, and delete local data without asking each time. Enable it?")) return;
        setAutoAllow(next);
        await save(messages, { autoAllow: next });
    };

    const clearHistory = async () => {
        if (!window.confirm("Clear the local assistant conversation? Your expense data will not be changed.")) return;
        await db.clearAssistantSession();
        setMessages([]);
        setSession(null);
        setAutoAllow(false);
        setDraft("");
        setStatus("");
    };

    return <>
        <button
            type="button"
            aria-label="Open expense assistant"
            onClick={() => setOpen(true)}
            className="fixed bottom-24 right-4 md:bottom-6 z-40 rounded-full bg-basic-gradient text-white p-4 shadow-xl cursor-pointer"
        >
            <IoChatbubbleEllipses size={26}/>
        </button>
        {open && <div className="fixed inset-0 z-fixed flex justify-end bg-black/40" onMouseDown={() => setOpen(false)}>
            <section
                role="dialog"
                aria-modal="true"
                aria-label="Expense assistant"
                onMouseDown={event => event.stopPropagation()}
                className="flex h-full w-full max-w-md flex-col bg-background text-foreground shadow-2xl"
            >
                <header className="flex items-center gap-3 border-b border-foreground/15 px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <h2 className="font-semibold">Xpensed Assistant</h2>
                        <p className="text-xs opacity-70">Tools run locally in this browser</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={autoAllow} onChange={toggleAutoAllow}/>
                        Auto Allow
                    </label>
                    <button type="button" aria-label="Clear chat history" onClick={clearHistory} className="p-2 cursor-pointer"><IoTrash/></button>
                    <button type="button" aria-label="Close assistant" onClick={() => setOpen(false)} className="p-2 cursor-pointer"><IoClose size={22}/></button>
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
                    {!messages.length && <div className="mt-12 text-center text-sm opacity-70">
                        Ask about transactions, categories, or shops. I can also create, update, and delete them with your permission.
                    </div>}
                    {messages.map(message => <div key={message.id} className={`mb-3 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] whitespace-pre-wrap select-text rounded-2xl px-3 py-2 text-sm ${message.role === "user" ? "bg-basic-gradient text-white" : "bg-foreground/10"}`}>
                            {message.role === "assistant" ? <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown> : message.content}
                        </div>
                    </div>)}
                    {draft && <div className="mb-3 flex justify-start"><div className="max-w-[85%] select-text rounded-2xl bg-foreground/10 px-3 py-2 text-sm"><ReactMarkdown components={markdownComponents}>{draft}</ReactMarkdown></div></div>}
                    {pending && <div className="mb-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                        <p className="font-semibold">Allow this change?</p>
                        <p className="mt-2 whitespace-pre-line select-text text-xs">{formatMutationPreview(pending.call, pending.preview)}</p>
                        <div className="mt-3 flex justify-end gap-2">
                            <button type="button" onClick={() => finishApproval(false)} className="rounded-lg border border-foreground/20 px-3 py-1.5 cursor-pointer">Cancel</button>
                            <button type="button" onClick={() => finishApproval(true)} className="rounded-lg bg-basic-gradient px-3 py-1.5 text-white cursor-pointer">Allow changes</button>
                        </div>
                    </div>}
                    {status && <p className="mb-3 text-xs opacity-70">{status}</p>}
                    <div ref={endRef}/>
                </div>

                <p className="border-t border-foreground/10 px-4 pt-2 text-[11px] opacity-60">
                    Only data needed for your request is sent to Gemini. Free-tier data may be used by Google to improve its products.
                </p>
                <form onSubmit={submit} className="flex gap-2 p-4 pt-2">
                    <textarea
                        value={input}
                        onChange={event => setInput(event.target.value)}
                        onKeyDown={event => {
                            if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                event.currentTarget.form?.requestSubmit();
                            }
                        }}
                        rows={2}
                        maxLength={2000}
                        disabled={busy}
                        aria-label="Message"
                        placeholder="Ask Xpensed…"
                        className="min-h-11 flex-1 resize-none select-text rounded-xl border border-foreground/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-ocean-blue disabled:opacity-60"
                    />
                    <button type="submit" disabled={busy || !input.trim()} aria-label="Send message" className="self-end rounded-xl bg-basic-gradient p-3 text-white disabled:opacity-40 cursor-pointer">
                        <IoSend/>
                    </button>
                </form>
            </section>
        </div>}
    </>;
}
