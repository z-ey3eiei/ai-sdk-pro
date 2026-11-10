import type { UIMessage } from 'ai';

export type ChatMessages = readonly UIMessage[];

export interface ChatClientOptions {
  /** Absolute API origin, for example `https://chat.example.com`. */
  readonly baseUrl?: string;
  /** Endpoint path or absolute URL. Defaults to `/api/chat`. */
  readonly endpoint?: string;
  readonly headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
  readonly credentials?: RequestCredentials;
  readonly fetch?: typeof globalThis.fetch;
}

export interface ChatStreamOptions {
  /** Cancels this stream when aborted. `client.stop()` also aborts it. */
  readonly signal?: AbortSignal;
  /** Additional JSON fields sent alongside the UIMessage array. */
  readonly body?: Readonly<Record<string, unknown>>;
  readonly headers?: HeadersInit;
  readonly credentials?: RequestCredentials;
}

export interface ChatClientErrorOptions {
  readonly status: number;
  readonly body: string;
  readonly response?: Response;
}

export class ChatClientError extends Error {
  readonly status: number;
  readonly body: string;
  readonly response?: Response;

  constructor(message: string, options: ChatClientErrorOptions) {
    super(message);
    this.name = 'ChatClientError';
    this.status = options.status;
    this.body = options.body;
    this.response = options.response;
  }
}

export class ChatStreamParseError extends Error {
  readonly payload: string;

  constructor(payload: string) {
    super(`The chat endpoint returned an invalid UI message SSE payload: ${payload}`);
    this.name = 'ChatStreamParseError';
    this.payload = payload;
  }
}

/** The typed subset of AI SDK 6 UI message stream chunks used by this client. */
export type UIMessageStreamChunk =
  | { readonly type: 'start'; readonly messageId?: string; readonly messageMetadata?: unknown }
  | { readonly type: 'start-step' }
  | { readonly type: 'finish-step'; readonly finishReason?: string; readonly usage?: unknown }
  | { readonly type: 'finish'; readonly finishReason?: string; readonly usage?: unknown }
  | { readonly type: 'text-start'; readonly id: string }
  | { readonly type: 'text-delta'; readonly id: string; readonly delta: string }
  | { readonly type: 'text-end'; readonly id: string }
  | { readonly type: 'reasoning-start'; readonly id: string }
  | { readonly type: 'reasoning-delta'; readonly id: string; readonly delta: string }
  | { readonly type: 'reasoning-end'; readonly id: string }
  | { readonly type: 'source-url'; readonly sourceId: string; readonly url: string; readonly title?: string }
  | { readonly type: 'source-document'; readonly sourceId: string; readonly mediaType: string; readonly title: string }
  | { readonly type: 'file'; readonly mediaType: string; readonly url: string }
  | { readonly type: 'tool-input-start'; readonly toolCallId: string; readonly toolName: string; readonly dynamic?: boolean }
  | { readonly type: 'tool-input-delta'; readonly toolCallId: string; readonly inputTextDelta: string }
  | { readonly type: 'tool-input-available'; readonly toolCallId: string; readonly toolName: string; readonly input: unknown }
  | { readonly type: 'tool-input-error'; readonly toolCallId: string; readonly toolName: string; readonly input: unknown; readonly errorText: string }
  | { readonly type: 'tool-approval-request'; readonly approvalId: string; readonly toolCallId: string; readonly approvalDescriptor?: unknown; readonly inputSchemaInput?: unknown; readonly signature?: string }
  | { readonly type: 'tool-output-available'; readonly toolCallId: string; readonly output: unknown }
  | { readonly type: 'tool-output-error'; readonly toolCallId: string; readonly errorText: string }
  | { readonly type: 'tool-output-denied'; readonly toolCallId: string }
  | { readonly type: 'error'; readonly errorText?: string }
  | { readonly type: 'abort'; readonly reason?: string }
  | { readonly type: 'message-metadata'; readonly messageMetadata: unknown }
  | ({ readonly type: `data-${string}`; readonly id?: string; readonly data?: unknown } & Readonly<Record<string, unknown>>)
  | ({ readonly type: string } & Readonly<Record<string, unknown>>);

export interface ChatEventBase {
  readonly chunk: UIMessageStreamChunk;
  /** The optional SSE `event:` field, before the AI SDK chunk type is applied. */
  readonly eventName?: string;
}

export type ChatEvent =
  | (ChatEventBase & { readonly type: 'start'; readonly messageId?: string })
  | (ChatEventBase & { readonly type: 'start-step' })
  | (ChatEventBase & { readonly type: 'finish-step'; readonly finishReason?: string })
  | (ChatEventBase & { readonly type: 'finish'; readonly finishReason?: string })
  | (ChatEventBase & { readonly type: 'text-start'; readonly id: string })
  | (ChatEventBase & { readonly type: 'text-delta'; readonly id: string; readonly delta: string })
  | (ChatEventBase & { readonly type: 'text-end'; readonly id: string })
  | (ChatEventBase & { readonly type: 'reasoning-start'; readonly id: string })
  | (ChatEventBase & { readonly type: 'reasoning-delta'; readonly id: string; readonly delta: string })
  | (ChatEventBase & { readonly type: 'reasoning-end'; readonly id: string })
  | (ChatEventBase & { readonly type: 'source-url'; readonly sourceId: string; readonly url: string; readonly title?: string })
  | (ChatEventBase & { readonly type: 'source-document'; readonly sourceId: string; readonly title: string })
  | (ChatEventBase & { readonly type: 'file'; readonly mediaType: string; readonly url: string })
  | (ChatEventBase & { readonly type: 'tool-input-start'; readonly toolCallId: string; readonly toolName: string })
  | (ChatEventBase & { readonly type: 'tool-input-delta'; readonly toolCallId: string; readonly inputTextDelta: string })
  | (ChatEventBase & { readonly type: 'tool-input-available'; readonly toolCallId: string; readonly toolName: string; readonly input: unknown })
  | (ChatEventBase & { readonly type: 'tool-input-error'; readonly toolCallId: string; readonly toolName: string; readonly errorText: string })
  | (ChatEventBase & { readonly type: 'tool-approval-request'; readonly approvalId: string; readonly toolCallId: string })
  | (ChatEventBase & { readonly type: 'tool-output-available'; readonly toolCallId: string; readonly output: unknown })
  | (ChatEventBase & { readonly type: 'tool-output-error'; readonly toolCallId: string; readonly errorText: string })
  | (ChatEventBase & { readonly type: 'tool-output-denied'; readonly toolCallId: string })
  | (ChatEventBase & { readonly type: 'error'; readonly errorText?: string })
  | (ChatEventBase & { readonly type: 'abort'; readonly reason?: string })
  | (ChatEventBase & { readonly type: 'message-metadata'; readonly messageMetadata: unknown })
  | (ChatEventBase & { readonly type: 'data'; readonly name: string; readonly data: unknown })
  | (ChatEventBase & { readonly type: 'unknown'; readonly name: string });

interface SseRecord {
  readonly eventName?: string;
  readonly data: string;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(value: Readonly<Record<string, unknown>>, key: string): string | undefined {
  const field = value[key];
  return typeof field === 'string' ? field : undefined;
}

function chunkFromPayload(value: unknown, eventName?: string): UIMessageStreamChunk | undefined {
  if (!isRecord(value)) return undefined;
  const payloadType = stringField(value, 'type') ?? eventName;
  if (!payloadType) return undefined;
  return { ...value, type: payloadType } as UIMessageStreamChunk;
}

function eventFromChunk(chunk: UIMessageStreamChunk, eventName?: string): ChatEvent {
  const record = chunk as Readonly<Record<string, unknown>>;
  const base = { chunk, eventName };
  switch (chunk.type) {
    case 'start':
      return { ...base, type: 'start', messageId: stringField(record, 'messageId') };
    case 'start-step':
      return { ...base, type: 'start-step' };
    case 'finish-step':
      return { ...base, type: 'finish-step', finishReason: stringField(record, 'finishReason') };
    case 'finish':
      return { ...base, type: 'finish', finishReason: stringField(record, 'finishReason') };
    case 'text-start':
      return { ...base, type: 'text-start', id: stringField(record, 'id') ?? '' };
    case 'text-delta':
      return { ...base, type: 'text-delta', id: stringField(record, 'id') ?? '', delta: stringField(record, 'delta') ?? '' };
    case 'text-end':
      return { ...base, type: 'text-end', id: stringField(record, 'id') ?? '' };
    case 'reasoning-start':
      return { ...base, type: 'reasoning-start', id: stringField(record, 'id') ?? '' };
    case 'reasoning-delta':
      return { ...base, type: 'reasoning-delta', id: stringField(record, 'id') ?? '', delta: stringField(record, 'delta') ?? '' };
    case 'reasoning-end':
      return { ...base, type: 'reasoning-end', id: stringField(record, 'id') ?? '' };
    case 'source-url':
      return {
        ...base,
        type: 'source-url',
        sourceId: stringField(record, 'sourceId') ?? '',
        url: stringField(record, 'url') ?? '',
        title: stringField(record, 'title'),
      };
    case 'source-document':
      return {
        ...base,
        type: 'source-document',
        sourceId: stringField(record, 'sourceId') ?? '',
        title: stringField(record, 'title') ?? '',
      };
    case 'file':
      return { ...base, type: 'file', mediaType: stringField(record, 'mediaType') ?? '', url: stringField(record, 'url') ?? '' };
    case 'tool-input-start':
      return {
        ...base,
        type: 'tool-input-start',
        toolCallId: stringField(record, 'toolCallId') ?? '',
        toolName: stringField(record, 'toolName') ?? '',
      };
    case 'tool-input-delta':
      return {
        ...base,
        type: 'tool-input-delta',
        toolCallId: stringField(record, 'toolCallId') ?? '',
        inputTextDelta: stringField(record, 'inputTextDelta') ?? '',
      };
    case 'tool-input-available':
      return {
        ...base,
        type: 'tool-input-available',
        toolCallId: stringField(record, 'toolCallId') ?? '',
        toolName: stringField(record, 'toolName') ?? '',
        input: record.input,
      };
    case 'tool-input-error':
      return {
        ...base,
        type: 'tool-input-error',
        toolCallId: stringField(record, 'toolCallId') ?? '',
        toolName: stringField(record, 'toolName') ?? '',
        errorText: stringField(record, 'errorText') ?? '',
      };
    case 'tool-approval-request':
      return {
        ...base,
        type: 'tool-approval-request',
        approvalId: stringField(record, 'approvalId') ?? '',
        toolCallId: stringField(record, 'toolCallId') ?? '',
      };
    case 'tool-output-available':
      return { ...base, type: 'tool-output-available', toolCallId: stringField(record, 'toolCallId') ?? '', output: record.output };
    case 'tool-output-error':
      return { ...base, type: 'tool-output-error', toolCallId: stringField(record, 'toolCallId') ?? '', errorText: stringField(record, 'errorText') ?? '' };
    case 'tool-output-denied':
      return { ...base, type: 'tool-output-denied', toolCallId: stringField(record, 'toolCallId') ?? '' };
    case 'error':
      return { ...base, type: 'error', errorText: stringField(record, 'errorText') };
    case 'abort':
      return { ...base, type: 'abort', reason: stringField(record, 'reason') };
    case 'message-metadata':
      return { ...base, type: 'message-metadata', messageMetadata: record.messageMetadata };
    default:
      if (chunk.type.startsWith('data-')) {
        return { ...base, type: 'data', name: chunk.type.slice(5), data: record.data };
      }
      return { ...base, type: 'unknown', name: eventName ?? chunk.type };
  }
}

function parseSseRecord(record: string): SseRecord | undefined {
  let eventName: string | undefined;
  const dataLines: string[] = [];
  for (const line of record.split('\n')) {
    if (line.startsWith(':')) continue;
    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    const valueStart = separator === -1 ? 0 : separator + 1;
    const value = line.slice(valueStart).startsWith(' ') ? line.slice(valueStart + 1) : line.slice(valueStart);
    if (field === 'event') eventName = value;
    if (field === 'data') dataLines.push(value);
  }
  if (dataLines.length === 0) return undefined;
  return { eventName, data: dataLines.join('\n') };
}

function takeSseRecords(input: string, final: boolean): { readonly records: readonly SseRecord[]; readonly remainder: string } {
  const normalized = input.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  const records: SseRecord[] = [];
  let remainder = normalized;
  let separator = remainder.indexOf('\n\n');
  while (separator !== -1) {
    const record = parseSseRecord(remainder.slice(0, separator));
    if (record) records.push(record);
    remainder = remainder.slice(separator + 2);
    separator = remainder.indexOf('\n\n');
  }
  if (final && remainder.trim().length > 0) {
    const record = parseSseRecord(remainder);
    if (record) records.push(record);
    remainder = '';
  }
  return { records, remainder };
}

async function resolveHeaders(value: ChatClientOptions['headers']): Promise<HeadersInit | undefined> {
  return typeof value === 'function' ? value() : value;
}

function resolveUrl(baseUrl: string | undefined, endpoint: string): string {
  if (!baseUrl) return endpoint;
  return new URL(endpoint, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

export class ChatClient {
  private readonly options: ChatClientOptions;
  private readonly activeControllers = new Set<AbortController>();

  constructor(options: ChatClientOptions = {}) {
    this.options = options;
  }

  /** Abort every currently active request created by this client. */
  stop(): void {
    for (const controller of this.activeControllers) controller.abort();
  }

  /** Alias for stop(), convenient for UI stop buttons. */
  abort(): void {
    this.stop();
  }

  stream(messages: ChatMessages, options: ChatStreamOptions = {}): AsyncIterable<ChatEvent> {
    return this.createStream(messages, options);
  }

  private async *createStream(messages: ChatMessages, options: ChatStreamOptions): AsyncGenerator<ChatEvent> {
    const controller = new AbortController();
    const externalSignal = options.signal;
    const abortExternal = (): void => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', abortExternal, { once: true });
    }
    this.activeControllers.add(controller);

    try {
      const fetchImplementation = this.options.fetch ?? globalThis.fetch;
      if (!fetchImplementation) throw new Error('This runtime does not provide fetch; pass fetch in ChatClient options.');

      const headers = new Headers({ Accept: 'text/event-stream', 'Content-Type': 'application/json' });
      const defaultHeaders = await resolveHeaders(this.options.headers);
      if (defaultHeaders) new Headers(defaultHeaders).forEach((value, key) => headers.set(key, value));
      if (options.headers) new Headers(options.headers).forEach((value, key) => headers.set(key, value));

      const body = options.body ? { ...options.body, messages } : { messages };
      const response = await fetchImplementation(resolveUrl(this.options.baseUrl, this.options.endpoint ?? '/api/chat'), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        credentials: options.credentials ?? this.options.credentials,
        signal: controller.signal,
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new ChatClientError(`Chat request failed with HTTP ${response.status}.`, {
          status: response.status,
          body: responseBody,
          response,
        });
      }
      if (!response.body) throw new ChatClientError('Chat response did not include a readable body.', { status: response.status, body: '', response });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const result = await reader.read();
        if (result.value) buffer += decoder.decode(result.value, { stream: !result.done });
        const parsed = takeSseRecords(buffer, result.done);
        buffer = parsed.remainder;
        for (const record of parsed.records) {
          if (record.data.trim() === '[DONE]') continue;
          let payload: unknown;
          try {
            payload = JSON.parse(record.data) as unknown;
          } catch {
            throw new ChatStreamParseError(record.data);
          }
          const payloads = Array.isArray(payload) ? payload : [payload];
          for (const item of payloads) {
            const chunk = chunkFromPayload(item, record.eventName);
            if (chunk) yield eventFromChunk(chunk, record.eventName);
          }
        }
        if (result.done) break;
      }
    } finally {
      this.activeControllers.delete(controller);
      externalSignal?.removeEventListener('abort', abortExternal);
    }
  }
}
