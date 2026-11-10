'use client';

import { CodeBlock } from '@aisdkpro/ui';
import { Streamdown } from 'streamdown';

const fencedBlock = /```([^\n]*)\n([\s\S]*?)```/g;

function renderCodeBlock(meta: string, code: string, key: string) {
  const tokens = meta.trim().split(/\s+/).filter(Boolean);
  const language = tokens[0] || 'text';
  const filenameMatch = meta.match(/(?:^|\s)filename=(?:"([^"]+)"|'([^']+)'|(\S+))/);
  const filename = filenameMatch?.[1] ?? filenameMatch?.[2] ?? filenameMatch?.[3];

  return <CodeBlock key={key} code={code.replace(/\n$/, '')} language={language} filename={filename} />;
}

export function MarkdownContent({ content }: { content: string }) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  fencedBlock.lastIndex = 0;
  while ((match = fencedBlock.exec(content)) !== null) {
    const [full, meta, code] = match;
    if (match.index > cursor) {
      parts.push(<Streamdown key={`markdown-${index++}`}>{content.slice(cursor, match.index)}</Streamdown>);
    }
    parts.push(renderCodeBlock(meta, code, `code-${index++}`));
    cursor = match.index + full.length;
  }

  if (cursor < content.length) {
    parts.push(<Streamdown key={`markdown-${index}`}>{content.slice(cursor)}</Streamdown>);
  }

  return <div className="docs-markdown">{parts}</div>;
}
