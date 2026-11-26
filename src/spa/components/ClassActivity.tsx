"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getDashboardState,
  markApiDataFetched,
  studentCacheKey,
  useApiSession,
} from "../ApiTokenContext";
import { ActivityCharts } from "./ActivityCharts";
import {
  AssignmentSubmissions,
  CodeGradeApiError,
  fetchCourseGradebook,
  fetchStudentSubmissions,
} from "../CodeGradeApi";
import { Student } from "../Model";
import {
  ApiBreadcrumbs,
  ApiHeader,
  assignmentCodeGradeHref,
  courseCodeGradeHref,
  coursePath,
  submissionCodeGradeHref,
} from "./ApiNavigation";

interface ClassActivityProps {
  courseId: string;
  courseSlug: string;
}

interface ClassTimelineItem {
  id: string;
  studentName: string;
  assignmentName: string;
  assignmentId: string;
  submissionId: string;
  createdAt: string;
  grade: number | null;
}

const getErrorMessage = (reason: unknown): string =>
  reason instanceof CodeGradeApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : "Could not load class submissions.";

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown date"
    : new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
};

export const ClassActivity = ({
  courseId,
  courseSlug,
}: ClassActivityProps) => {
  const { state, setState } = useApiSession();
  const courseName =
    state.courses.find((item) => item.id === courseId)?.name ??
    courseSlug.replace(/-/g, " ");
  const gradebook = state.gradebooks[courseId];
  const [loadingGradebook, setLoadingGradebook] = useState(!gradebook);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const grouping = state.activityGrouping;

  useEffect(() => {
    if (!state.cacheHydrated) return;
    if (gradebook) {
      setLoadingGradebook(false);
      return;
    }

    const controller = new AbortController();
    setLoadingGradebook(true);
    setError("");

    void fetchCourseGradebook(courseId, controller.signal)
      .then((loadedGradebook) => {
        if (controller.signal.aborted) return;
        setState((current) => markApiDataFetched({
          ...current,
          connected: true,
          gradebooks: { ...current.gradebooks, [courseId]: loadedGradebook },
          dashboards: {
            ...current.dashboards,
            [courseId]: {
              ...getDashboardState(current, courseId),
              students: loadedGradebook.students,
            },
          },
        }));
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          connected:
            reason instanceof CodeGradeApiError && reason.status === 401
              ? false
              : current.connected,
        }));
        setError(getErrorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingGradebook(false);
      });

    return () => controller.abort();
  }, [courseId, gradebook, refreshKey, setState, state.cacheHydrated]);

  useEffect(() => {
    if (!state.cacheHydrated) return;
    if (!gradebook) return;

    const controller = new AbortController();
    const students = gradebook.students.filter(
      (student): student is Student & { CodeGradeId: string } =>
        Boolean(student.CodeGradeId),
    );
    const studentsWithoutCodeGradeId =
      gradebook.students.length - students.length;
    const studentsToFetch =
      refreshKey === 0
        ? students.filter(
            (student) =>
              !state.submissions[studentCacheKey(courseId, student.CodeGradeId)],
          )
        : students;
    if (studentsToFetch.length === 0 && studentsWithoutCodeGradeId === 0) {
      setLoadingActivity(false);
      setError("");
      return;
    }

    setLoadingActivity(true);
    setError("");

    void Promise.allSettled(
      studentsToFetch.map((student) =>
        fetchStudentSubmissions(
          courseId,
          student.CodeGradeId,
          gradebook.assignments,
          controller.signal,
        ),
      ),
    ).then((settled) => {
      if (controller.signal.aborted) return;

      const loaded: Record<string, AssignmentSubmissions[]> = {};
      const failed: string[] = [];
      let unauthorized = false;
      settled.forEach((result, index) => {
        const student = studentsToFetch[index];
        if (result.status === "fulfilled") {
          loaded[student.CodeGradeId] = result.value;
        } else {
          unauthorized ||= result.reason instanceof CodeGradeApiError &&
            result.reason.status === 401;
          failed.push(`${student.Name}: ${getErrorMessage(result.reason)}`);
        }
      });

      setLoadingActivity(false);
      setState((current) => {
        const hasLoadedData = Object.keys(loaded).length > 0;
        const nextState = {
          ...current,
          connected: unauthorized
            ? false
            : hasLoadedData
              ? true
              : current.connected,
          submissions: hasLoadedData
            ? {
                ...current.submissions,
                ...Object.fromEntries(
                  Object.entries(loaded).map(([studentId, submissions]) => [
                    studentCacheKey(courseId, studentId),
                    submissions,
                  ]),
                ),
              }
            : current.submissions,
        };
        return hasLoadedData ? markApiDataFetched(nextState) : nextState;
      });

      const issues = [...failed];
      if (studentsWithoutCodeGradeId > 0) {
        issues.push(
          `${studentsWithoutCodeGradeId} student${studentsWithoutCodeGradeId === 1 ? "" : "s"} could not be queried because their CodeGrade ID is missing.`,
        );
      }
      setError(issues.join(" "));
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingActivity(false);
    });

    return () => controller.abort();
  }, [
    courseId,
    gradebook,
    refreshKey,
    setState,
    state.cacheHydrated,
  ]);

  const timeline = useMemo<ClassTimelineItem[]>(() => {
    if (!gradebook) return [];
    return gradebook.students
      .flatMap((student) => {
        if (!student.CodeGradeId) return [];
        const assignments =
          state.submissions[studentCacheKey(courseId, student.CodeGradeId)];
        return (assignments ?? []).flatMap(({ assignment, submissions }) =>
          submissions.map((submission) => ({
            id: `${student.CodeGradeId}-${assignment.id}-${submission.id}`,
            studentName: student.Name || student.Id,
            assignmentName: assignment.name,
            assignmentId: assignment.id,
            submissionId: submission.id,
            createdAt: submission.createdAt,
            grade: submission.grade,
          })),
        );
      })
      .sort(
        (first, second) =>
          Date.parse(second.createdAt) - Date.parse(first.createdAt),
      );
  }, [courseId, gradebook, state.submissions]);

  const gradebookPath = coursePath({ id: courseId, name: courseName });
  const loading = loadingGradebook || loadingActivity;

  return (
    <>
      <ApiHeader />
      <main className="app-shell student-activity-page">
        <ApiBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "API", href: "/api" },
            { label: "Courses", href: "/api/courses" },
            { label: `Gradebook · ${courseName}`, href: gradebookPath },
            { label: "Class activity" },
          ]}
        />
        <section className="page-heading student-activity-heading">
          <div>
            <span className="eyebrow">
              <span className="eyebrow__dot" />
              {courseName} · Class activity
            </span>
            <h1>Class activity</h1>
            <p>Every recorded student submission, newest first.</p>
          </div>
          <div className="api-page-actions">
            <button
              className="text-button"
              onClick={() => setRefreshKey((current) => current + 1)}
              disabled={loading}
            >
              ↻ Reload activity
            </button>
            <a
              className="text-button"
              href={courseCodeGradeHref(courseId)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in CodeGrade ↗
            </a>
          </div>
        </section>

        {!state.connected && !loading && error && (
          <div className="api-empty-state">
            <h2>Reconnect to CodeGrade</h2>
            <p>Your CodeGrade session is unavailable or has expired.</p>
            <Link className="api-primary-button" href="/api">
              Connect to CodeGrade
            </Link>
          </div>
        )}

        {error && state.connected && (
          <div className="api-error" role="alert">
            <strong>Some class activity could not be loaded</strong>
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <section className="api-load-state" aria-live="polite">
            <span className="api-load-state__spinner" aria-hidden="true" />
            <div>
              <strong>
                {loadingGradebook
                  ? "Loading the class gradebook…"
                  : "Loading submissions for each student…"}
              </strong>
              <p>{courseName}</p>
            </div>
          </section>
        )}

        <ActivityCharts
          submissions={timeline}
          grouping={grouping}
          onGroupingChange={(nextGrouping) =>
            setState((current) => ({
              ...current,
              activityGrouping: nextGrouping,
            }))
          }
        />

        <section className="activity-panel timeline-panel">
          <div className="activity-panel__heading">
            <div>
              <span className="eyebrow">Recent work</span>
              <h2>Submission timeline</h2>
              <p>Student, assignment, submission ID, and submission time.</p>
            </div>
            <span className="heatmap-summary">
              {timeline.length} submission{timeline.length === 1 ? "" : "s"}
            </span>
          </div>
          {timeline.length ? (
            <ol className="submission-timeline">
              {timeline.map((item) => (
                <li className="submission-timeline__item" key={item.id}>
                  <span className="submission-timeline__marker" />
                  <div className="submission-timeline__content">
                    <p>
                      <strong>{item.studentName}</strong>
                      {" submitted "}
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
                      {" · "}
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
                    <span
                      className={`submission-timeline__grade${item.grade >= 5.5 ? " submission-timeline__grade--passing" : ""}`}
                    >
                      {item.grade.toFixed(1)}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            !loading && (
              <p className="timeline-empty">
                No submissions have been recorded for this class.
              </p>
            )
          )}
        </section>
      </main>
    </>
  );
};
