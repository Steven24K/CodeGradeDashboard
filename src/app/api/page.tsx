import Link from "next/link";

const ApiHeader = () => (
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

const MetricCard = ({ label }: { label: string }) => (
  <article className="summary-card">
    <div className="summary-card__label">{label}</div>
    <div className="summary-card__value">—</div>
    <div className="summary-card__note">Available after connection</div>
  </article>
);

const ApiPanel = ({ title }: { title: string }) => (
  <section className="api-panel">
    <div className="api-panel__header">
      <h3>{title}</h3>
      <span className="api-panel__tag">Waiting for data</span>
    </div>
    <div className="api-panel__placeholder">
      CodeGrade course data will appear here when the API is connected.
    </div>
  </section>
);

export default function ApiDashboard() {
  return (
    <>
      <ApiHeader />
      <main className="app-shell api-page">
        <section className="page-heading">
          <div>
            <span className="eyebrow">
              <span className="eyebrow__dot" />
              Live course data
            </span>
            <h1>CodeGrade API view.</h1>
            <p>
              A detailed course workspace for assignments, student activity,
              and assessment readiness.
            </p>
          </div>
          <span className="api-status">
            <span className="api-status__dot" />
            API not connected
          </span>
        </section>

        <section className="api-hero">
          <div className="api-hero__content">
            <span className="api-hero__eyebrow">Detailed course overview</span>
            <h2>Your CodeGrade data, all in one place.</h2>
            <p>
              This view is ready for a CodeGrade API connection. Once connected,
              it will show up-to-date course progress without replacing the
              private, browser-only CSV dashboard.
            </p>
          </div>
          <div className="api-hero__illustration" aria-hidden="true">
            ↗
          </div>
        </section>

        <section className="api-metrics" aria-label="Course metrics preview">
          <MetricCard label="Enrolled students" />
          <MetricCard label="Active assignments" />
          <MetricCard label="Average progress" />
          <MetricCard label="Assessment ready" />
        </section>

        <div className="api-panels">
          <ApiPanel title="Course progress" />
          <ApiPanel title="Assignment performance" />
          <ApiPanel title="Student activity" />
          <ApiPanel title="Assessment eligibility" />
        </div>

        <section className="api-setup" aria-label="API view connection roadmap">
          <article className="api-setup__step">
            <span className="api-setup__number">01</span>
            <div>
              <strong>Authorize securely</strong>
              <p>Connect an institution-approved CodeGrade API integration.</p>
            </div>
          </article>
          <article className="api-setup__step">
            <span className="api-setup__number">02</span>
            <div>
              <strong>Select a course</strong>
              <p>Load the course, assignment, and student data you need.</p>
            </div>
          </article>
          <article className="api-setup__step">
            <span className="api-setup__number">03</span>
            <div>
              <strong>Explore live progress</strong>
              <p>Review detailed progress and eligibility in this workspace.</p>
            </div>
          </article>
        </section>
      </main>
    </>
  );
}
