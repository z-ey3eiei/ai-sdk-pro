import { describe, expect, it, vi } from 'vitest';
import { ChatClient, ChatClientError, type ChatEvent } from '../src/index';

function streamResponse(chunks: readonly string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
  });
}

async function collect(events: AsyncIterable<ChatEvent>): Promise<ChatEvent[]> {
  const result: ChatEvent[] = [];
  for await (const event of events) result.push(event);
  return result;
}

describe('ChatClient', () => {
  it('posts UI messages and parses split AI SDK UI message SSE records', async () => {
    let requestUrl = '';
    let requestInit: RequestInit | undefined;
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requestUrl = String(input);
      requestInit = init;
      return streamResponse([
        'data: {"type":"start","messageId":"m1"}\n\n',
        'data: {"type":"text-delta","id":"text-1","delta":"hel',
        'lo"}\n\n',
        'data: {"type":"finish","finishReason":"stop"}\n\n',
        'data: [DONE]\n\n',
      ]);
    });
    const client = new ChatClient({ baseUrl: 'https://example.test', fetch: fetcher });

    const events = await collect(client.stream([]));

    expect(requestUrl).toBe('https://example.test/api/chat');
    expect(requestInit?.method).toBe('POST');
    expect(JSON.parse(String(requestInit?.body))).toEqual({ messages: [] });
    expect(events.map((event) => event.type)).toEqual(['start', 'text-delta', 'finish']);
    expect(events[0]).toMatchObject({ type: 'start', messageId: 'm1' });
    expect(events[1]).toMatchObject({ type: 'text-delta', id: 'text-1', delta: 'hello' });
  });

  it('sends BYOK in per-request body, not messages, and does not retain it for later requests', async () => {
    const bodies: unknown[] = [];
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body)));
      return streamResponse(['data: {"type":"finish","finishReason":"stop"}\n\n']);
    });
    const client = new ChatClient({ fetch: fetcher });
    const messages = [{ id: 'visitor-1', role: 'user' as const, parts: [{ type: 'text' as const, text: 'Hello' }] }];
    const byok = { provider: 'openai', model: 'gpt-5-mini', apiKey: 'test-only-key-not-a-real-secret' };
    await collect(client.stream(messages, { body: { byok } }));
    await collect(client.stream(messages));
    expect(bodies[0]).toEqual({ byok, messages });
    expect(bodies[1]).toEqual({ messages });
    expect(JSON.stringify(messages)).not.toContain(byok.apiKey);
  });

  it('preserves protocol fields on each event chunk alongside convenience mappings', async () => {
    const rawChunks = [
      { type: 'finish', finishReason: 'stop', usage: { inputTokens: 12, outputTokens: 7 } },
      { type: 'source-document', sourceId: 'source-1', mediaType: 'application/pdf', title: 'Guide', filename: 'guide.pdf' },
      { type: 'tool-input-error', toolCallId: 'call-1', toolName: 'lookup', input: { query: 'weather' }, errorText: 'invalid input' },
      {
        type: 'tool-approval-request',
        approvalId: 'approval-1',
        toolCallId: 'call-1',
        approvalDescriptor: { reason: 'needs confirmation' },
        inputSchemaInput: { query: 'weather' },
        signature: 'sig-1',
      },
    ];
    const fetcher = vi.fn(async () =>
      streamResponse(rawChunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)),
    );
    const client = new ChatClient({ fetch: fetcher });

    const events = await collect(client.stream([]));

    expect(events.map((event) => event.type)).toEqual([
      'finish',
      'source-document',
      'tool-input-error',
      'tool-approval-request',
    ]);
    expect(events.map((event) => event.chunk)).toEqual(rawChunks);
    expect(events[0]).toMatchObject({ type: 'finish', finishReason: 'stop' });
    expect(events[1]).toMatchObject({ type: 'source-document', sourceId: 'source-1', title: 'Guide' });
    expect(events[2]).toMatchObject({ type: 'tool-input-error', toolCallId: 'call-1', errorText: 'invalid input' });
    expect(events[3]).toMatchObject({ type: 'tool-approval-request', approvalId: 'approval-1', toolCallId: 'call-1' });
  });

  it('supports an external AbortSignal before the request starts', async () => {
    const signal = new AbortController();
    signal.abort();
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal?.aborted).toBe(true);
      throw new DOMException('Aborted', 'AbortError');
    });
    const client = new ChatClient({ fetch: fetcher });

    await expect(collect(client.stream([], { signal: signal.signal }))).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('propagates an external abort after the stream has started', async () => {
    const external = new AbortController();
    const encoder = new TextEncoder();
    let responseController: ReadableStreamDefaultController<Uint8Array> | undefined;
    let fetchSignalAborted = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        responseController = controller;
        controller.enqueue(encoder.encode('data: {"type":"start"}\n\n'));
      },
    });
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      init?.signal?.addEventListener(
        'abort',
        () => {
          fetchSignalAborted = true;
          responseController?.error(new DOMException('Aborted', 'AbortError'));
        },
        { once: true },
      );
      return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    });
    const client = new ChatClient({ fetch: fetcher });
    const iterator = client.stream([], { signal: external.signal })[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toMatchObject({ done: false, value: { type: 'start' } });
    external.abort();

    await expect(iterator.next()).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchSignalAborted).toBe(true);
  });

  it('exposes non-2xx responses as typed errors', async () => {
    const fetcher = vi.fn(async () => new Response('provider unavailable', { status: 503 }));
    const client = new ChatClient({ fetch: fetcher });

    await expect(collect(client.stream([]))).rejects.toBeInstanceOf(ChatClientError);
    await expect(collect(client.stream([]))).rejects.toMatchObject({ status: 503, body: 'provider unavailable' });
  });
});
