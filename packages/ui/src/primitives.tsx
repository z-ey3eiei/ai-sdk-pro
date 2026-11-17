"use client";

import Link from "next/link";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

function joinClasses(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function GeistCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={joinClasses("geist-card", className)}>{children}</div>;
}

export type PlatformStatusKind = "ready" | "building" | "error" | "byok" | "edge";

export function StatusBadge({
  status,
  children,
  className,
}: {
  status: PlatformStatusKind;
  children?: ReactNode;
  className?: string;
}) {
  const defaultLabels: Record<PlatformStatusKind, string> = {
    ready: "Ready",
    building: "Building",
    error: "Error",
    byok: "BYOK",
    edge: "Edge",
  };
  return (
    <span className={joinClasses("status-badge", `status-badge--${status}`, className)}>
      <span className="status-badge__dot" aria-hidden="true" />
      {children ?? defaultLabels[status]}
    </span>
  );
}

export interface SubNavItem {
  label: string;
  href: string;
  disabled?: boolean;
}

export function SubNavTabs({
  items,
  activeHref,
  label = "Section navigation",
}: {
  items: readonly SubNavItem[];
  activeHref: string;
  label?: string;
}) {
  return (
    <nav className="sub-nav-tabs" aria-label={label}>
      {items.map(item =>
        item.disabled ? (
          <span className="sub-nav-tabs__tab sub-nav-tabs__tab--disabled" key={item.href} aria-disabled="true">
            {item.label}
          </span>
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className={joinClasses("sub-nav-tabs__tab", activeHref === item.href ? "sub-nav-tabs__tab--active" : undefined)}
            aria-current={activeHref === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        )
      )}
    </nav>
  );
}

export function SkeletonBlock({
  width = "100%",
  height = 16,
  className,
}: {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
}) {
  return <div className={joinClasses("skeleton-block", className)} style={{ width, height }} aria-hidden="true" />;
}

export function EmptyStateBox({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <section className="empty-state-box" aria-label={title}>
      {icon ? <div className="empty-state-box__icon" aria-hidden="true">{icon}</div> : null}
      <h2 className="empty-state-box__title">{title}</h2>
      <p className="empty-state-box__description">{description}</p>
      {action ? <div className="empty-state-box__action">{action}</div> : null}
    </section>
  );
}
