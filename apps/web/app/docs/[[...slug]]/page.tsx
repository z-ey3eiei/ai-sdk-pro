import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { docs } from "../../../../docs/lib/content";
import { MarkdownContent } from "@/components/MarkdownContent";
import SiteHeader from "@/components/SiteHeader";
import { createSeoMetadata } from "@/lib/seo-metadata";

export function generateStaticParams() {
  return docs.map(doc => ({ slug: [doc.slug] }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!slug?.length) redirect("/docs/getting-started");

  const doc = docs.find(item => item.slug === slug.join("/"));
  if (!doc) notFound();

  const title =
    doc.slug === "client-sdk" ? "Client SDK Guide & Usage" : `${doc.title} Guide`;
  return createSeoMetadata({
    title,
    description: doc.description,
    path: `/docs/${doc.slug}`,
    type: "article",
    locale: "th_TH",
    keywords: [
      doc.title,
      "คู่มือ AI agent",
      "AI SDK documentation",
      "พัฒนา AI agent",
    ],
  });
}

export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  if (!slug?.length) redirect("/docs/getting-started");

  const doc = docs.find(item => item.slug === slug.join("/"));
  if (!doc) notFound();

  const index = docs.indexOf(doc);
  return (
    <>
      <SiteHeader active="docs" />
      <main className="docs-shell">
        <aside className="docs-sidebar">
          <h3>DOCUMENTATION</h3>
          {docs.map(item => (
            <Link
              key={item.slug}
              href={`/docs/${item.slug}`}
              className={item.slug === doc.slug ? "active" : ""}
            >
              {item.title}
            </Link>
          ))}
        </aside>
        <article className="docs-article">
          <div className="breadcrumb">
            Documentation <ChevronRight size={11} /> {doc.category}
          </div>
          <h1>{doc.title}</h1>
          <p className="docs-description">{doc.description}</p>
          <MarkdownContent content={doc.body.replace(/^# .+\n/, "")} />
          <nav className="docs-pagination" aria-label="Documentation navigation">
            {index > 0 && (
              <Link href={`/docs/${docs[index - 1].slug}`}>
                <small>PREVIOUS</small>
                {docs[index - 1].title}
              </Link>
            )}
            {index < docs.length - 1 && (
              <Link href={`/docs/${docs[index + 1].slug}`}>
                <small>NEXT</small>
                {docs[index + 1].title}
              </Link>
            )}
          </nav>
        </article>
      </main>
    </>
  );
}
