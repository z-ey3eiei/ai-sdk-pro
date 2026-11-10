export class RequestPolicyError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}
export async function withAbort<T>(
  promise: PromiseLike<T>,
  signal: AbortSignal
): Promise<T> {
  signal.throwIfAborted();
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([promise, aborted]);
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}
export async function readLimitedBody(
  request: Request,
  signal: AbortSignal,
  maxBytes = 128000
) {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes)
    throw new RequestPolicyError(
      "Conversation is too large. Start a new chat.",
      413
    );
  if (!request.body)
    throw new RequestPolicyError("A JSON request body is required.", 400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await withAbort(reader.read(), signal);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes)
        throw new RequestPolicyError(
          "Conversation is too large. Start a new chat.",
          413
        );
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
}
