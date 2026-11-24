import Link from "next/link";

export const ApiHeader = () => (
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
    </nav>
  </header>
);

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
