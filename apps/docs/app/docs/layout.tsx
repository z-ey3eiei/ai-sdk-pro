import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { pageTree } from '@/lib/page-tree';

export default function DocumentationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <DocsLayout
      tree={pageTree}
      nav={{
        url: '/',
        title: (
          <span className="docs-wordmark" aria-label="ai-sdk.pro">
            AI SDK <em>PRO</em>
          </span>
        ),
      }}
      links={[
        { type: 'main', text: 'Project site', url: 'https://ai-sdk.pro', external: true },
        { type: 'main', text: 'Playground', url: 'https://ai-sdk.pro/chat', external: true },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
