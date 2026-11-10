export type KnowledgeSnippet = {
  id: string;
  title: string;
  content: string;
};

/**
 * Deliberately small, editable, local knowledge. This is keyword search over
 * snippets, not a vector database or a claim of full RAG infrastructure.
 */
export const KNOWLEDGE_SNIPPETS: readonly KnowledgeSnippet[] = [
  {
    id: "ai-sdk-ui-chat",
    title: "AI SDK UI chat transport",
    content:
      "useChat manages UI messages in React. DefaultChatTransport sends those messages to a server route and consumes the UI message stream. Keep request-specific values in prepareSendMessagesRequest so the current value is used for every send and retry.",
  },
  {
    id: "ai-sdk-tool-loop",
    title: "ToolLoopAgent basics",
    content:
      "ToolLoopAgent combines a language model with tools. Give every tool an inputSchema, use an explicit stop condition such as stepCountIs, and keep tool execution bounded and safe for the application.",
  },
  {
    id: "next-app-router-route",
    title: "Next.js App Router route handler",
    content:
      "A Next.js App Router API route exports POST(request: Request). Validate the complete request before calling a provider, return a streaming Response, and use an AbortSignal for cancellation and a deadline.",
  },
  {
    id: "byok-memory-only",
    title: "Memory-only BYOK",
    content:
      "A browser BYOK flow can hold a masked provider key in React memory and send it only in a request body. Do not persist the key in localStorage, cookies, URLs, logs, analytics, or UI message parts. HTTPS and provider billing disclosure still matter.",
  },
] as const;

function termsFor(query: string) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/gi, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 2)
    .slice(0, 12);
}

export function searchLocalDocs(query: string) {
  const normalized = query.trim().slice(0, 160);
  const terms = termsFor(normalized);
  const ranked = KNOWLEDGE_SNIPPETS.map((snippet, index) => {
    const haystack = `${snippet.title} ${snippet.content}`.toLowerCase();
    const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
    return { snippet, score, index };
  }).sort((left, right) => right.score - left.score || left.index - right.index);
  const selected = ranked.filter((entry) => entry.score > 0).slice(0, 3);
  const fallback = selected.length > 0 ? selected : ranked.slice(0, 2);

  return {
    query: normalized,
    searchMode: "local-keyword-snippets",
    matches: fallback.map(({ snippet }) => ({
      sourceId: snippet.id,
      title: snippet.title,
      excerpt: snippet.content,
    })),
  };
}
