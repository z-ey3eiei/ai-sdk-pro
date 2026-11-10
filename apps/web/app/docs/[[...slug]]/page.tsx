import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { Header } from "@aisdkpro/ui";
import { docs } from "../../../../docs/lib/content";
import { MarkdownContent } from "@/components/MarkdownContent";

export function generateStaticParams() {
  return docs.map(doc => ({ slug: [doc.slug] }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = docs.find(d => d.slug === slug?.[0]);
  return {
    title: doc?.title ?? "Documentation",
    description: doc?.description,
    alternates: { canonical: doc ? `/docs/${doc.slug}` : "/docs" },
    openGraph: {
      title: `${doc?.title ?? "Documentation"} · ai-sdk.pro`,
      description: doc?.description,
      url: doc
        ? `https://ai-sdk.pro/docs/${doc.slug}`
        : "https://ai-sdk.pro/docs",
    },
  };
}
export default async function DocsPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  if (!slug?.length) redirect("/docs/getting-started");
  const doc = docs.find(d => d.slug === slug.join("/"));
  if (!doc) notFound();
  const index = docs.indexOf(doc);
  return (
    <>
      <Header active="docs" />
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
          <nav
            className="docs-pagination"
            aria-label="Documentation navigation"
          >
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
