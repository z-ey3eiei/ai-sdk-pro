import { NextResponse } from 'next/server';
import { docs } from '@/lib/content';

type SearchResult = {
  id: string;
  type: 'page' | 'heading' | 'text';
  content: string;
  url: string;
  breadcrumbs?: string[];
};

export const dynamic = 'force-dynamic';

function plainText(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function excerpt(text: string, query: string) {
  const lower = text.toLocaleLowerCase();
  const index = lower.indexOf(query.toLocaleLowerCase());
  if (index < 0) return text.slice(0, 180);
  const start = Math.max(0, index - 58);
  const end = Math.min(text.length, index + query.length + 122);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

export function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('query')?.trim() ?? '';
  if (!query) return NextResponse.json([]);

  const normalized = query.toLocaleLowerCase();
  const terms = normalized.split(/\s+/).filter(Boolean);
  const results = docs
    .map((doc): { score: number; result: SearchResult } | null => {
      const body = plainText(doc.body);
      const title = doc.title.toLocaleLowerCase();
      const description = doc.description.toLocaleLowerCase();
      const searchable = `${title} ${description} ${body.toLocaleLowerCase()}`;
      if (!searchable.includes(normalized) && !terms.every((term) => searchable.includes(term))) return null;

      let score = searchable.includes(normalized) ? 10 : 0;
      for (const term of terms) {
        if (title.includes(term)) score += 8;
        if (description.includes(term)) score += 4;
        if (body.toLocaleLowerCase().includes(term)) score += 1;
      }

      return {
        score,
        result: {
          id: `doc-${doc.slug}`,
          type: 'page',
          content: `${doc.title}\n\n${excerpt(body, query)}`,
          url: `/docs/${doc.slug}`,
          breadcrumbs: [doc.category],
        },
      };
    })
    .filter((value): value is { score: number; result: SearchResult } => value !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, 12)
    .map(({ result }) => result);

  return NextResponse.json(results);
}
