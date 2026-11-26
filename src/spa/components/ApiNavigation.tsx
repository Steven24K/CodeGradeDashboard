"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useApiSession } from "../ApiTokenContext";

const formatFetchedAge = (timestamp: string | null, now: number): string => {
  if (!timestamp) return "No cached data";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Cached date unavailable";

  const minutes = Math.max(0, Math.floor((now - date.getTime()) / 60_000));
  const age =
    minutes < 1
      ? "just now"
      : minutes < 60
        ? `${minutes} minute${minutes === 1 ? "" : "s"} ago`
        : minutes < 1440
          ? `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) === 1 ? "" : "s"} ago`
          : `${Math.floor(minutes / 1440)} day${Math.floor(minutes / 1440) === 1 ? "" : "s"} ago`;
  return `Fetched ${new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)} · ${age}`;
};

export const ApiHeader = () => {
  const { state, reloadCachedData } = useApiSession();
  const [now, setNow] = useState<number | null>(null);
  const fetchedAge =
    now === null
      ? "Loading cache status…"
      : formatFetchedAge(state.lastFetchedAt, now);
  const fetchedDate = state.lastFetchedAt ?? "No cached CodeGrade data";

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <header className="app-header">
      <Link className="brand" href="/" aria-label="Gradeboard home">
        <span className="brand__mark">g</span>
        <span>gradeboard</span>
        <span className="brand__sub">for CodeGrade</span>
      </Link>
      <nav className="app-nav" aria-label="Main navigation">
        <Link className="app-nav__link" href="/">
          CSV dashboard
        </Link>
        <Link className="app-nav__link app-nav__link--active" href="/api">
          API view
        </Link>
        <div className="api-cache-control">
          <button
            className="app-nav__link api-cache-control__button"
            type="button"
            onClick={reloadCachedData}
            disabled={!state.cacheHydrated}
            title="Reload the saved CodeGrade data from this browser"
          >
            ↻ Reload cache
          </button>
          <span
            className="api-cache-control__status"
            title={fetchedDate}
            aria-live="polite"
          >
            {state.cacheError || fetchedAge}
          </span>
        </div>
      </nav>
    </header>
  );
};

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const ApiBreadcrumbs = ({
  items,
}: {
  items: BreadcrumbItem[];
}) => (
  <nav className="breadcrumbs" aria-label="Breadcrumb">
    <ol>
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`}>
          {item.href && index < items.length - 1 ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

export const ExternalLink = ({
  href,
  label,
}: {
  href: string;
  label: string;
}) => (
  <a
    className="external-link"
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`${label} (opens in a new tab)`}
    title={`${label} · opens in a new tab`}
  >
    <span aria-hidden="true">↗</span>
  </a>
);

export const courseSlug = (name: string): string =>
  name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "course";

export const coursePath = (course: { id: string; name: string }): string =>
  `/api/courses/${encodeURIComponent(course.id)}/${encodeURIComponent(courseSlug(course.name))}`;

export const courseCodeGradeHref = (courseId: string): string =>
  `https://app.codegra.de/courses/${encodeURIComponent(courseId)}/assignments#assignments`;

export const assignmentCodeGradeHref = (
  courseId: string,
  assignmentId: string,
): string =>
  `https://app.codegra.de/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(assignmentId)}/submissions#assignment-description`;

export const submissionCodeGradeHref = (
  courseId: string,
  assignmentId: string,
  submissionId: string,
): string =>
  `https://app.codegra.de/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(submissionId)}`;
