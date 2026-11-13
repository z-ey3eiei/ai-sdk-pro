import Link from "next/link";
import { ArrowRight, ArrowUpRight, FileText, Globe2, MessageSquare } from "lucide-react";
import type { StarterTemplate } from "@/lib/starter-catalog";
import { formatArchiveSize } from "./template-utils";

export default function StarterCard({
  template,
}: {
  template: StarterTemplate;
}) {
  const Icon =
    template.icon === "chat"
      ? MessageSquare
      : template.icon === "docs"
        ? FileText
        : Globe2;

  return (
    <article className="starter-card">
      <Link href={`/templates/${template.slug}`} className="starter-card-link">
        <div className="starter-card-topline">
          <span className="starter-card-icon" aria-hidden="true">
            <Icon size={18} strokeWidth={1.7} />
          </span>
          <span className="starter-card-category">{template.category}</span>
          <ArrowUpRight
            className="starter-card-arrow"
            size={16}
            aria-hidden="true"
          />
        </div>
        <div className="starter-card-copy">
          <h3>{template.title}</h3>
          <p className="starter-card-tagline">{template.tagline}</p>
          <p className="starter-card-description">{template.description}</p>
        </div>
        <div className="starter-card-features">
          {template.features.slice(0, 3).map(feature => (
            <span key={feature}>{feature}</span>
          ))}
        </div>
        <div className="starter-card-meta">
          <span>{template.framework}</span>
          <span>
            {template.fileCount} files · {formatArchiveSize(template.bytes)}
          </span>
        </div>
        <span className="starter-card-action">
          ดูรายละเอียดและวิธีเริ่มต้น <ArrowRight size={14} aria-hidden="true" />
        </span>
      </Link>
    </article>
  );
}
