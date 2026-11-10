"use client";
import { Streamdown } from "streamdown";
import { CodeBlock } from "@aisdkpro/ui";
export function MarkdownContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="docs-markdown">
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          const firstLine = part.slice(3, part.indexOf("\n"));
          const language = firstLine.split(/\s/)[0] || "text";
          const filename = firstLine.match(/filename=(\S+)/)?.[1];
          const code = part.slice(part.indexOf("\n") + 1, -3).trimEnd();
          return (
            <CodeBlock
              key={index}
              code={code}
              language={language}
              filename={filename}
            />
          );
        }
        return <Streamdown key={index}>{part}</Streamdown>;
      })}
    </div>
  );
}
