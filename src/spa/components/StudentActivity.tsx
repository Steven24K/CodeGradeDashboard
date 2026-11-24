"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  getDashboardState,
  studentCacheKey,
  useApiSession,
} from "../ApiTokenContext";
import {
  AssignmentSubmissions,
  CodeGradeApiError,
  CodeGradeSubmission,
  fetchCourseGradebook,
  fetchStudentSubmissions,
} from "../CodeGradeApi";
import {
  ApiBreadcrumbs,
  ApiHeader,
  assignmentCodeGradeHref,
  ExternalLink,
  submissionCodeGradeHref,
} from "./ApiNavigation";
import {
  Exercise,
  isAssignment,
  isChallenge,
  isMaster,
  isOptional,
  isProblem,
  TimeGrouping,
} from "../Model";

type BoardStatus = "todo" | "in-progress" | "done";
type AssignmentKind =
  | "Problem"
  | "Optional"
  | "Assignment"
  | "Master"
  | "Challenge";
interface AssignmentCardData {
  assignment: AssignmentSubmissions["assignment"];
  submissions: CodeGradeSubmission[];
  latest: CodeGradeSubmission | null;
  status: BoardStatus;
  kind: AssignmentKind;
  deadline: string | null;
}

interface TimelineItem {
  id: string;
  submissionId: string;
  assignmentId: string;
  assignmentName: string;
  createdAt: string;
  grade: number | null;
  kind: AssignmentKind;
}

interface ActivityBucket {
  key: string;
  label: string;
  count: number;
}

interface StudentActivityProps {
  courseId: string;
  courseSlug: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
}

const boardColumns: { status: BoardStatus; title: string }[] = [
  { status: "todo", title: "To do" },
  { status: "in-progress", title: "In progress" },
  { status: "done", title: "Done" },
];

const getAssignmentKind = (exercise: Exercise): AssignmentKind => {
  if (isMaster(exercise)) return "Master";
  if (isChallenge(exercise)) return "Challenge";
  if (isAssignment(exercise)) return "Assignment";
  if (isOptional(exercise)) return "Optional";
  if (isProblem(exercise)) return "Problem";
  return "Optional";
};

const getAssignmentStatus = (
  submissions: CodeGradeSubmission[],
): BoardStatus => {
  if (submissions.length === 0) return "todo";
  const latest = submissions[0];
  return latest.grade !== null && latest.grade >= 5.5 ? "done" : "in-progress";
};

const formatDate = (date: string | null): string => {
  if (!date) return "No deadline";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "No deadline"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed);
};

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const startOfWeek = (date: Date): Date => {
  const start = startOfDay(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
};

const addGrouping = (date: Date, grouping: TimeGrouping): Date => {
  const next = new Date(date);
  if (grouping === "hour") next.setHours(next.getHours() + 1);
  if (grouping === "day") next.setDate(next.getDate() + 1);
  if (grouping === "week") next.setDate(next.getDate() + 7);
  if (grouping === "month") next.setMonth(next.getMonth() + 1);
  return next;
};

const groupingStart = (date: Date, grouping: TimeGrouping): Date => {
  if (grouping === "hour") {
    const start = new Date(date);
    start.setMinutes(0, 0, 0);
    return start;
  }
  if (grouping === "day") return startOfDay(date);
  if (grouping === "week") return startOfWeek(date);
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const groupingLabel = (date: Date, grouping: TimeGrouping): string => {
  if (grouping === "hour") {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(date);
  }
  if (grouping === "month") {
    return new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
};

const getBuckets = (
  submissions: TimelineItem[],
  grouping: TimeGrouping,
): ActivityBucket[] => {
  const now = new Date();
  const limits: Record<TimeGrouping, number> = {
    hour: 24,
    day: 14,
    week: 12,
    month: 12,
  };
  const count = limits[grouping];
  const current = groupingStart(now, grouping);
  const first = new Date(current);
  for (let index = 1; index < count; index += 1) {
    if (grouping === "hour") first.setHours(first.getHours() - 1);
    if (grouping === "day") first.setDate(first.getDate() - 1);
    if (grouping === "week") first.setDate(first.getDate() - 7);
    if (grouping === "month") first.setMonth(first.getMonth() - 1);
  }

  const bucketByKey = new Map<string, ActivityBucket>();
  const cursor = new Date(first);
  for (let index = 0; index < count; index += 1) {
    const key =
      grouping === "hour"
        ? `${dayKey(cursor)}-${cursor.getHours()}`
        : grouping === "month"
          ? `${cursor.getFullYear()}-${cursor.getMonth()}`
          : grouping === "week"
            ? dayKey(startOfWeek(cursor))
            : dayKey(cursor);
    bucketByKey.set(key, {
      key,
      label: groupingLabel(cursor, grouping),
      count: 0,
    });
    const next = addGrouping(cursor, grouping);
    cursor.setTime(next.getTime());
  }

  for (const submission of submissions) {
    const date = new Date(submission.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const start = groupingStart(date, grouping);
    const key =
      grouping === "hour"
        ? `${dayKey(start)}-${start.getHours()}`
        : grouping === "month"
          ? `${start.getFullYear()}-${start.getMonth()}`
          : grouping === "week"
            ? dayKey(startOfWeek(start))
            : dayKey(start);
    const bucket = bucketByKey.get(key);
    if (bucket) bucket.count += 1;
  }

  return [...bucketByKey.values()];
};

const getHeatmap = (submissions: TimelineItem[]) => {
  const counts = new Map<string, number>();
  for (const submission of submissions) {
    const date = new Date(submission.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = dayKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = startOfDay(new Date());
  const first = new Date(today);
  first.setDate(first.getDate() - first.getDay() - 52 * 7);

  return Array.from({ length: 371 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    const count = counts.get(dayKey(date)) ?? 0;
    const isFuture = date > today;
    const level =
      count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4;
    return {
      key: dayKey(date),
      date,
      count,
      level: isFuture ? -1 : level,
      isFuture,
    };
  });
};

const getProgress = (cards: AssignmentCardData[]) => {
  const done = cards.filter((card) => card.status === "done").length;
  const inProgress = cards.filter((card) => card.status === "in-progress").length;
  const todo = cards.filter((card) => card.status === "todo").length;
  return { done, inProgress, todo, total: cards.length };
};

export const StudentActivity = ({
  courseId,
  courseSlug,
  studentId,
  studentName,
  studentNumber,
}: StudentActivityProps) => {
  const { state, setState } = useApiSession();
  const courses = state.courses;
  const course = courses.find((item) => item.id === courseId);
  const courseName = course?.name ?? courseSlug.replace(/-/g, " ");
  const gradebookPath = `/api/courses/${encodeURIComponent(courseId)}/${encodeURIComponent(courseSlug)}`;
  const cacheKey = studentCacheKey(courseId, studentId);
  const activityKey = `activity:${cacheKey}`;
  const results = state.submissions[cacheKey] ?? null;
  const loading = state.loading === activityKey;
  const error = state.error;
  const grouping = state.activityGrouping;

  useEffect(() => {
    if (state.submissions[cacheKey]) return;
    const controller = new AbortController();
    setState((current) => ({
      ...current,
      loading: activityKey,
      error: "",
    }));

    void (async () => {
      try {
        let gradebook = state.gradebooks[courseId];
        if (!gradebook) {
          gradebook = await fetchCourseGradebook(courseId, controller.signal);
          if (controller.signal.aborted) return;
          setState((current) => ({
            ...current,
            connected: true,
            gradebooks: { ...current.gradebooks, [courseId]: gradebook },
            dashboards: {
              ...current.dashboards,
              [courseId]: {
                ...getDashboardState(current, courseId),
                students: gradebook.students,
              },
            },
          }));
        }

        const data = await fetchStudentSubmissions(
          courseId,
          studentId,
          gradebook.assignments,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setState((current) => ({
            ...current,
            connected: true,
            submissions: { ...current.submissions, [cacheKey]: data },
            loading: null,
            error: "",
          }));
        }
      } catch (reason) {
        if (controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          connected:
            reason instanceof CodeGradeApiError && reason.status === 401
              ? false
              : current.connected,
          loading: null,
          error:
            reason instanceof CodeGradeApiError
              ? reason.message
              : reason instanceof Error
                ? reason.message
                : "Could not load student submissions.",
        }));
      } finally {
        if (!controller.signal.aborted) {
          setState((current) =>
            current.loading === activityKey
              ? { ...current, loading: null }
              : current,
          );
        }
      }
    })();

    return () => controller.abort();
  }, [
    courseId,
    studentId,
    state.activityRefreshes[cacheKey],
  ]);

  const assignmentCards = useMemo<AssignmentCardData[]>(() => {
    if (!results) return [];
    return results.map(({ assignment, submissions }) => {
      const sorted = [...submissions].sort(
        (first, second) =>
          Date.parse(second.createdAt) - Date.parse(first.createdAt),
      );
      const latest = sorted[0] ?? null;
      const exercise: Exercise = {
        Title: assignment.name,
        Score:
          latest?.grade === null || latest === null
            ? { kind: "left", v: "" }
            : { kind: "right", v: latest.grade },
      };
      return {
        assignment,
        submissions: sorted,
        latest,
        status: getAssignmentStatus(sorted),
        kind: getAssignmentKind(exercise),
        deadline: latest?.deadline ?? latest?.lockDate ?? null,
      };
    });
  }, [results]);

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!results) return [];
    return results.flatMap(({ assignment, submissions }) =>
      submissions.map((submission) => ({
        id: `${assignment.id}-${submission.id}`,
        submissionId: submission.id,
        assignmentId: assignment.id,
        assignmentName: assignment.name,
        createdAt: submission.createdAt,
        grade: submission.grade,
        kind: getAssignmentKind({
          Title: assignment.name,
          Score:
            submission.grade === null
              ? { kind: "left", v: "" }
              : { kind: "right", v: submission.grade },
        }),
      })),
    ).sort(
      (first, second) =>
        Date.parse(second.createdAt) - Date.parse(first.createdAt),
    );
  }, [results]);

  const buckets = useMemo(
    () => getBuckets(timeline, grouping),
    [timeline, grouping],
  );
  const heatmap = useMemo(() => getHeatmap(timeline), [timeline]);
  const progress = useMemo(() => getProgress(assignmentCards), [assignmentCards]);
  const maxBucket = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const maxDay = Math.max(1, ...heatmap.map((day) => day.count));
  const submissionsLastWeek = timeline.filter(
    (item) => Date.now() - Date.parse(item.createdAt) < 7 * 24 * 60 * 60 * 1000,
  ).length;

  return (
    <>
      <ApiHeader />

      <main className="app-shell student-activity-page">
        <ApiBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "API", href: "/api" },
            { label: "Courses", href: "/api/courses" },
            { label: "Gradebook", href: gradebookPath },
            {
              label: `${studentName || "Student"}${studentNumber ? ` · ${studentNumber}` : ""}`,
            },
          ]}
        />
        <section className="page-heading student-activity-heading">
          <div>
            <span className="eyebrow">
              <span className="eyebrow__dot" />
              {courseName} · Student activity
            </span>
            <h1>{studentName || studentNumber || "Student progress"}</h1>
            <p>
              Student number {studentNumber || "—"} · Internal CodeGrade ID{" "}
              {studentId}
            </p>
          </div>
          <button
            className="text-button"
            onClick={() =>
              setState((current) => {
                const submissions = { ...current.submissions };
                delete submissions[cacheKey];
                return {
                  ...current,
                  submissions,
                  activityRefreshes: {
                    ...current.activityRefreshes,
                    [cacheKey]: (current.activityRefreshes[cacheKey] ?? 0) + 1,
                  },
                  loading: activityKey,
                  error: "",
                };
              })
            }
            disabled={loading}
          >
            ↻ Reload activity
          </button>
        </section>

        {error && (
          <div className="api-error" role="alert">
            <strong>Couldn&apos;t load student activity</strong>
            <span>{error}</span>
            {!state.connected && (
              <Link className="api-primary-button" href="/api">
                Connect to CodeGrade
              </Link>
            )}
          </div>
        )}

        {loading && (
          <section className="api-load-state" aria-live="polite">
            <span className="api-load-state__spinner" aria-hidden="true" />
            <div>
              <strong>Loading assignment submissions…</strong>
              <p>
                Checking each assignment sequentially to keep requests gentle
                on CodeGrade.
              </p>
            </div>
          </section>
        )}

        {results && !loading && (
          <>
            <section className="summary-grid student-activity-metrics" aria-label="Student progress summary">
              <Metric label="Assignments" value={progress.total} note="In this course" />
              <Metric label="Done" value={progress.done} note="Latest grade 5.5 or higher" tone="good" />
              <Metric label="In progress" value={progress.inProgress} note="Submission needs another pass" tone="warm" />
              <Metric label="Submissions this week" value={submissionsLastWeek} note={`${timeline.length} total submissions`} />
            </section>

            <section className="activity-panel">
              <div className="activity-panel__heading">
                <div>
                  <span className="eyebrow">Submission analytics</span>
                  <h2>Work over time</h2>
                  <p>Submission count grouped by {grouping}.</p>
                </div>
                <label className="filter-control activity-grouping">
                  <span>Group by</span>
                  <select
                    value={grouping}
                    onChange={(event) =>
                      setState((current) => ({
                        ...current,
                        activityGrouping: event.target.value as TimeGrouping,
                      }))
                    }
                  >
                    <option value="hour">Hour · last 24 hours</option>
                    <option value="day">Day · last 14 days</option>
                    <option value="week">Week · last 12 weeks</option>
                    <option value="month">Month · last 12 months</option>
                  </select>
                </label>
              </div>
              <div className="submission-chart" role="img" aria-label={`Submissions by ${grouping}`}>
                {buckets.map((bucket) => (
                  <div className="submission-chart__item" key={bucket.key}>
                    <span className="submission-chart__count">{bucket.count || ""}</span>
                    <div className="submission-chart__bar-wrap">
                      <div
                        className="submission-chart__bar"
                        style={{
                          height: `${bucket.count ? Math.max(5, (bucket.count / maxBucket) * 100) : 0}%`,
                        }}
                        title={`${bucket.count} submissions · ${bucket.label}`}
                      />
                    </div>
                    <span className="submission-chart__label">{bucket.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="activity-panel heatmap-panel">
              <div className="activity-panel__heading">
                <div>
                  <span className="eyebrow">Consistency</span>
                  <h2>Submission activity</h2>
                  <p>Each square represents one day during the past year.</p>
                </div>
                <span className="heatmap-summary">
                  {timeline.length} submissions total
                </span>
              </div>
              <div className="activity-heatmap" aria-label="Daily submission activity for the past year">
                {heatmap.map((day) => (
                  <span
                    className={`activity-heatmap__day activity-heatmap__day--${day.level}`}
                    key={day.key}
                    title={`${day.count} submissions on ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(day.date)}`}
                    style={{ opacity: day.count ? 0.4 + (day.count / maxDay) * 0.6 : 1 }}
                    aria-hidden={day.isFuture}
                  />
                ))}
              </div>
              <div className="heatmap-legend">
                <span>Less</span>
                {[0, 1, 2, 3, 4].map((level) => (
                  <i className={`activity-heatmap__day--${level}`} key={level} />
                ))}
                <span>More</span>
              </div>
            </section>

            <section className="work-board-section">
              <div className="activity-panel__heading">
                <div>
                  <span className="eyebrow">Assignment tracker</span>
                  <h2>Student work board</h2>
                  <p>
                    A submission with a grade below 5.5 stays in progress.
                    Items without submissions are to do.
                  </p>
                </div>
                <span className="heatmap-summary">{progress.total} assignments</span>
              </div>
              <div className="work-board">
                {boardColumns.map((column) => {
                  const cards = assignmentCards.filter(
                    (card) => card.status === column.status,
                  );
                  return (
                    <section
                      className={`work-column work-column--${column.status}`}
                      key={column.status}
                    >
                      <h3>
                        <span className="work-column__indicator" />
                        {column.title}
                        <span className="work-column__count">{cards.length}</span>
                      </h3>
                      <div className="work-column__cards">
                        {cards.map((card) => (
                          <article
                            className={`work-card work-card--${card.kind.toLowerCase()}`}
                            key={card.assignment.id}
                          >
                            <div className="work-card__topline">
                              <span className={`work-card__kind work-card__kind--${card.kind.toLowerCase()}`}>
                                {card.kind}
                              </span>
                              <span className={`work-card__status work-card__status--${card.status}`}>
                                {column.title}
                              </span>
                            </div>
                            <div className="work-card__assignment">
                              <h4>
                                <a
                                  href={assignmentCodeGradeHref(
                                    courseId,
                                    card.assignment.id,
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {card.assignment.name}
                                </a>
                              </h4>
                              <ExternalLink
                                href={assignmentCodeGradeHref(
                                  courseId,
                                  card.assignment.id,
                                )}
                                label={`Open ${card.assignment.name} in CodeGrade`}
                              />
                            </div>
                            <div className="work-card__footer">
                              <span>
                                {card.submissions.length
                                  ? `${card.submissions.length} submission${card.submissions.length === 1 ? "" : "s"}`
                                  : "No submissions"}
                              </span>
                              {card.latest?.grade !== null &&
                                card.latest !== null && (
                                  <strong>{card.latest.grade.toFixed(1)}</strong>
                                )}
                            </div>
                            {card.deadline && (
                              <div className="work-card__deadline">
                                Deadline · {formatDate(card.deadline)}
                              </div>
                            )}
                          </article>
                        ))}
                        {cards.length === 0 && (
                          <p className="work-column__empty">Nothing here yet</p>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </section>

            <section className="activity-panel timeline-panel">
              <div className="activity-panel__heading">
                <div>
                  <span className="eyebrow">Recent work</span>
                  <h2>Submission timeline</h2>
                  <p>Every recorded submission, newest first.</p>
                </div>
                <span className="heatmap-summary">{timeline.length} events</span>
              </div>
              {timeline.length ? (
                <ol className="submission-timeline">
                  {timeline.map((item) => (
                    <li className="submission-timeline__item" key={item.id}>
                      <span className={`submission-timeline__marker submission-timeline__marker--${item.kind.toLowerCase()}`} />
                      <div className="submission-timeline__content">
                        <p>
                          <strong>{studentName || studentNumber || "Student"}</strong>
                          {" "}created a submission on{" "}
                          <a
                            href={assignmentCodeGradeHref(
                              courseId,
                              item.assignmentId,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {item.assignmentName}
                          </a>
                          {" "}
                          <ExternalLink
                            href={assignmentCodeGradeHref(
                              courseId,
                              item.assignmentId,
                            )}
                            label={`Open ${item.assignmentName} in CodeGrade`}
                          />
                          {" "}
                          <a
                            className="submission-id-link"
                            href={submissionCodeGradeHref(
                              courseId,
                              item.assignmentId,
                              item.submissionId,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open submission #${item.submissionId} in CodeGrade in a new tab`}
                          >
                            #{item.submissionId}
                          </a>
                        </p>
                        <time dateTime={item.createdAt}>
                          {formatDate(item.createdAt)}
                        </time>
                      </div>
                      {item.grade !== null && (
                        <span className={`submission-timeline__grade${item.grade >= 5.5 ? " submission-timeline__grade--passing" : ""}`}>
                          {item.grade.toFixed(1)}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="timeline-empty">
                  No submissions have been recorded for this student.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
};

const Metric = ({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  tone?: "good" | "warm";
}) => (
  <article className={`summary-card${tone ? ` summary-card--${tone}` : ""}`}>
    <div className="summary-card__label">{label}</div>
    <div className="summary-card__value">{value}</div>
    <div className="summary-card__note">{note}</div>
  </article>
);
