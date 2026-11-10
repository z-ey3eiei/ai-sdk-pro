import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@aisdkpro/ui";
import SiteHeader from "@/components/SiteHeader";
import StarterDetail from "@/components/templates/StarterDetail";
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
  const canonicalUrl = `https://ai-sdk.pro/templates/${slug}`;

  if (!template) {
    return {
      title: "Starter not found",
      alternates: { canonical: canonicalUrl },
    };
  }

  return {
    title: template.title,
    description: template.description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${template.title} · ai-sdk.pro`,
      description: template.description,
      url: canonicalUrl,
    },
  };
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
