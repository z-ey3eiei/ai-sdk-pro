"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { StarterCategory, StarterTemplate } from "@/lib/starter-catalog";
import StarterCard from "./StarterCard";

type Filter = "All" | StarterCategory;

const filters: Filter[] = ["All", "Chat", "Agents", "Web"];

export default function TemplatesCatalog({
  templates,
}: {
  templates: StarterTemplate[];
}) {
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const categoryCounts = templates.reduce<Record<Filter, number>>(
      (result, template) => {
        result[template.category] += 1;
        result.All += 1;
        return result;
      },
      { All: 0, Chat: 0, Agents: 0, Web: 0 }
    );
    return categoryCounts;
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return templates.filter(template => {
      const matchesFilter =
        activeFilter === "All" || template.category === activeFilter;
      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;
      return [
        template.title,
        template.tagline,
        template.description,
        template.category,
        template.framework,
        ...template.features,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeFilter, query, templates]);

  function resetFilters() {
    setActiveFilter("All");
    setQuery("");
  }

  return (
    <section
      className="starter-catalog"
      aria-labelledby="starter-catalog-title"
    >
      <div className="templates-page-container">
        <div className="starter-catalog-heading">
          <div>
            <span className="starter-catalog-kicker">THE STARTER CATALOG</span>
            <h2 id="starter-catalog-title">Pick a useful first step.</h2>
          </div>
          <p>
            ทุกตัวมี source archive จริง setup ที่คัดลอกได้
            และทางเลือกให้คุณตรวจสอบ ก่อนเปิด DevStack
          </p>
        </div>

        <div className="starter-catalog-toolbar">
          <label className="starter-search">
            <Search size={16} aria-hidden="true" />
            <span className="starter-visually-hidden">
              ค้นหา starter templates
            </span>
            <input
              type="search"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="ค้นหา starter, framework หรือ feature"
            />
          </label>
          <div
            className="starter-filter-list"
            role="group"
            aria-label="กรองตามประเภท"
          >
            <span className="starter-filter-label">
              <SlidersHorizontal size={13} aria-hidden="true" />
              Filter
            </span>
            {filters.map(filter => (
              <button
                key={filter}
                type="button"
                className="starter-filter-button"
                aria-pressed={activeFilter === filter}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
                <span className="starter-filter-count">{counts[filter]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="starter-results-row" aria-live="polite">
          <span>
            แสดง {filteredTemplates.length} จาก {templates.length} starters
          </span>
          {(activeFilter !== "All" || query) && (
            <button type="button" onClick={resetFilters}>
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {filteredTemplates.length > 0 ? (
          <div className="starter-card-grid">
            {filteredTemplates.map(template => (
              <StarterCard key={template.slug} template={template} />
            ))}
          </div>
        ) : (
          <div className="starter-empty-state">
            <span className="starter-empty-mark" aria-hidden="true">
              /
            </span>
            <h2>ยังไม่พบ starter ที่ตรงกัน</h2>
            <p>ลองใช้คำค้นอื่น หรือกลับไปดู starter ทั้งหมด</p>
            <button type="button" onClick={resetFilters}>
              ดูทั้งหมด
            </button>
          </div>
        )}
        <p className="starter-catalog-contact">
          มีคำถามเกี่ยวกับ starter หรือ local setup?{" "}
          <a href="mailto:sdkbank@1origin.dev">ติดต่อทีม ai-sdk.pro</a>
        </p>
      </div>
    </section>
  );
}
