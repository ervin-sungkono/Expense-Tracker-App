import { assistantExpenseTools, type ExpenseToolName } from '@lib/mcp/tool-catalog';

export const ASSISTANT_TOOL_NAMES = assistantExpenseTools.map(tool => tool.name);

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };
export type AssistantPart = JsonObject;

export interface AssistantContent {
  role: 'user' | 'model';
  parts: AssistantPart[];
}

export interface AssistantFunctionResult {
  id?: string | null;
  name: ExpenseToolName;
  response: JsonObject;
}

export interface AssistantContinuation {
  modelParts: AssistantPart[];
  functionResults: AssistantFunctionResult[];
}

export interface AssistantRequest {
  history: AssistantContent[];
  message?: string;
  continuation?: AssistantContinuation;
}

export type AssistantEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; id: string | null; name: ExpenseToolName; args: JsonObject }
  | {
      type: 'done';
      modelParts: AssistantPart[];
      model?: string;
      responseId?: string;
      finishReason?: string;
    }
  | {
      type: 'error';
      code: 'invalid_request' | 'authentication' | 'configuration' | 'quota' | 'model';
      message: string;
    };

export const ASSISTANT_MAX_REQUEST_BYTES = 512 * 1024;

export class AssistantProtocolError extends Error {
  readonly code = 'invalid_request' as const;

  constructor() {
    super('Invalid assistant request.');
    this.name = 'AssistantProtocolError';
  }
}

const MAX_HISTORY_ITEMS = 200;
const MAX_PARTS = 64;
const MAX_JSON_DEPTH = 12;
const MAX_JSON_NODES = 4000;
const MAX_STRING_LENGTH = 512 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: string[]) {
  return Object.keys(value).every(key => allowed.includes(key));
}

function isJsonValue(value: unknown, depth = 0, state = { nodes: 0 }): value is JsonValue {
  state.nodes += 1;
  if (state.nodes > MAX_JSON_NODES || depth > MAX_JSON_DEPTH) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'string') return value.length <= MAX_STRING_LENGTH;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(item => isJsonValue(item, depth + 1, state));
  if (!isRecord(value)) return false;
  return Object.entries(value).every(([key, item]) => {
    if (['__proto__', 'constructor', 'prototype'].includes(key)) return false;
    return isJsonValue(item, depth + 1, state);
  });
}

function validateParts(value: unknown, required = true): asserts value is AssistantPart[] {
  if (!Array.isArray(value) || value.length < (required ? 1 : 0) || value.length > MAX_PARTS) {
    throw new AssistantProtocolError();
  }
  if (!value.every(part => isRecord(part) && isJsonValue(part))) {
    throw new AssistantProtocolError();
  }
}

function validateHistory(value: unknown) {
  if (!Array.isArray(value) || value.length > MAX_HISTORY_ITEMS) {
    throw new AssistantProtocolError();
  }
  for (const content of value) {
    if (
      !isRecord(content) ||
      !hasOnlyKeys(content, ['role', 'parts']) ||
      (content.role !== 'user' && content.role !== 'model')
    ) {
      throw new AssistantProtocolError();
    }
    validateParts(content.parts);
  }
  return value as AssistantContent[];
}

function validateContinuation(value: unknown): AssistantContinuation {
  if (!isRecord(value) || !hasOnlyKeys(value, ['modelParts', 'functionResults'])) {
    throw new AssistantProtocolError();
  }
  validateParts(value.modelParts);
  if (
    !Array.isArray(value.functionResults) ||
    value.functionResults.length < 1 ||
    value.functionResults.length > ASSISTANT_TOOL_NAMES.length
  ) {
    throw new AssistantProtocolError();
  }
  const functionResults = value.functionResults.map(result => {
    if (
      !isRecord(result) ||
      !hasOnlyKeys(result, ['id', 'name', 'response']) ||
      typeof result.name !== 'string' ||
      !ASSISTANT_TOOL_NAMES.includes(result.name as ExpenseToolName) ||
      !isRecord(result.response) ||
      !isJsonValue(result.response) ||
      (result.id !== undefined && result.id !== null && typeof result.id !== 'string')
    ) {
      throw new AssistantProtocolError();
    }
    return {
      id: result.id as string | null | undefined,
      name: result.name as ExpenseToolName,
      response: result.response as JsonObject,
    };
  });
  return { modelParts: value.modelParts as AssistantPart[], functionResults };
}

export function parseAssistantRequest(value: unknown): AssistantRequest {
  if (!isRecord(value) || !hasOnlyKeys(value, ['history', 'message', 'continuation'])) {
    throw new AssistantProtocolError();
  }
  const history = validateHistory(value.history ?? []);
  const message = value.message;
  if (
    message !== undefined &&
    (typeof message !== 'string' || !message.trim() || message.length > 8000)
  ) {
    throw new AssistantProtocolError();
  }
  if (message !== undefined && value.continuation !== undefined) {
    throw new AssistantProtocolError();
  }
  if (value.continuation !== undefined) {
    return { history, continuation: validateContinuation(value.continuation) };
  }
  if (message !== undefined) return { history, message };
  if (!history.length) throw new AssistantProtocolError();
  return { history };
}
