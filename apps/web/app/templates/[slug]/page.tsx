import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@aisdkpro/ui";
import SiteHeader from "@/components/SiteHeader";
import StarterDetail from "@/components/templates/StarterDetail";
import { createSeoMetadata } from "@/lib/seo-metadata";
import { getStarter, starterTemplates } from "@/lib/starter-catalog";

type StarterRouteProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return starterTemplates.map(template => ({ slug: template.slug }));
}

export async function generateMetadata({
  params,
}: StarterRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const template = getStarter(slug);
  if (!template) notFound();

  return createSeoMetadata({
    title: `${template.title} Starter`,
    description: template.description,
    path: `/templates/${template.slug}`,
    keywords: [
      template.title,
      `${template.category} AI starter`,
      "AI SDK 6",
      "downloadable source code",
    ],
  });
}

export default async function StarterPage({ params }: StarterRouteProps) {
  const { slug } = await params;
  const template = getStarter(slug);
  if (!template) notFound();

  return (
    <>
      <SiteHeader active="templates" />
      <main className="templates-page starter-detail-page">
        <StarterDetail template={template} />
      </main>
      <Footer />
    </>
  );
}
