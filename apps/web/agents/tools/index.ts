import { tool } from "ai";
import { z } from "zod";
import { docs } from "../../../docs/lib/content";

export const getCurrentTime = tool({
  description:
    "Get the real current time in an IANA timezone. Use this rather than guessing the date.",
  inputSchema: z.object({ timeZone: z.string().max(100).default("UTC") }),
  execute: async ({ timeZone }) => {
    try {
      return {
        iso: new Date().toISOString(),
        timeZone,
        formatted: new Intl.DateTimeFormat("en-US", {
          dateStyle: "full",
          timeStyle: "long",
          timeZone,
        }).format(new Date()),
      };
    } catch {
      return { error: "Invalid IANA timezone. Try UTC or Asia/Bangkok." };
    }
  },
});
export const searchDocs = tool({
  description:
    "Search the local ai-sdk.pro documentation. Cite the returned documentation path in your answer.",
  inputSchema: z.object({ query: z.string().min(1).max(200) }),
  execute: async ({ query }) => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return docs
      .map(doc => ({
        doc,
        score: terms.reduce(
          (sum, term) =>
            sum +
            (doc.title + " " + doc.description + " " + doc.body)
              .toLowerCase()
              .split(term).length -
            1,
          0
        ),
      }))
      .filter(row => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ doc }) => ({
        title: doc.title,
        url: `/docs/${doc.slug}`,
        content: doc.body.slice(0, 5000),
      }));
  },
});
const ALLOWED_HOSTS = new Set([
  "ai-sdk.dev",
  "nextjs.org",
  "fumadocs.dev",
  "turborepo.dev",
  "docs.docker.com",
  "caddyserver.com",
]);
export function isApprovedUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      ALLOWED_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}
export const fetchUrl = tool({
  description:
    "Read approved public documentation at ai-sdk.dev, nextjs.org, fumadocs.dev, turborepo.dev, docs.docker.com, or caddyserver.com. Other hosts and private addresses are blocked.",
  inputSchema: z.object({
    url: z
      .string()
      .max(1500)
      .describe(
        "A complete HTTPS documentation URL. Host and URL syntax are checked before fetching."
      ),
  }),
  execute: async ({ url }, { abortSignal }) => {
    if (!isApprovedUrl(url))
      return {
        error:
          "URL blocked. Only HTTPS URLs on the approved documentation hosts are allowed.",
      };
    try {
      const response = await fetch(url, {
        signal: AbortSignal.any([
          abortSignal ?? new AbortController().signal,
          AbortSignal.timeout(10000),
        ]),
        redirect: "manual",
        headers: { Accept: "text/html,text/plain" },
      });
      if (!response.ok)
        return {
          error: `Documentation server returned HTTP ${response.status}. Redirects are intentionally blocked.`,
        };
      if (!response.body) return { error: "No response body." };
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      let bytes = 0;
      try {
        while (bytes < 250000) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          text += decoder.decode(value, { stream: true });
        }
      } finally {
        await reader.cancel();
      }
      const content = text
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000);
      return { url, content, truncated: content.length >= 8000 };
    } catch {
      return { error: "Documentation fetch failed or timed out." };
    }
  },
});
