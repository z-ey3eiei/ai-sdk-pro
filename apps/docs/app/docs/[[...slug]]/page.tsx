import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { docs } from '@/lib/content';
import { MarkdownContent } from '@/components/MarkdownContent';

const siteUrl = 'https://ai-sdk.pro';

function findDoc(slug?: string[]) {
  return docs.find((doc) => doc.slug === slug?.join('/'));
}

export const dynamicParams = false;

export function generateStaticParams() {
  return docs.map((doc) => ({ slug: [doc.slug] }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug?: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = findDoc(slug);

  if (!doc) {
    return { title: 'Documentation', description: 'ai-sdk.pro documentation.' };
  }

  const image = `/docs/og?slug=${encodeURIComponent(doc.slug)}`;
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: `${siteUrl}/docs/${doc.slug}` },
    openGraph: {
      type: 'article',
      url: `${siteUrl}/docs/${doc.slug}`,
      title: `${doc.title} · ai-sdk.pro`,
      description: doc.description,
      images: [{ url: image, width: 1200, height: 630, alt: `${doc.title} · ai-sdk.pro` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${doc.title} · ai-sdk.pro`,
      description: doc.description,
      images: [image],
    },
  };
}

export default async function DocumentationPage({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params;
  if (!slug?.length) redirect('/docs/getting-started');

  const doc = findDoc(slug);
  if (!doc) notFound();

  const body = doc.body.replace(/^# [^\n]+\n?/, '').trim();
  return (
    <DocsPage
      className="docs-page"
      tableOfContent={{ enabled: false }}
      breadcrumb={{ enabled: true }}
      footer={{ enabled: false }}
    >
      <DocsTitle className="docs-page-title">{doc.title}</DocsTitle>
      <DocsDescription>{doc.description}</DocsDescription>
      <DocsBody>
        <MarkdownContent content={body} />
      </DocsBody>
    </DocsPage>
  );
}
