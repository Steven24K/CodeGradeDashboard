"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  getDashboardState,
  markApiDataFetched,
  useApiSession,
} from "../ApiTokenContext";
import { CodeGradeApiError, fetchCourseGradebook } from "../CodeGradeApi";
import { AppState, Exercise } from "../Model";
import {
  ApiBreadcrumbs,
  ApiHeader,
  assignmentCodeGradeHref,
  courseCodeGradeHref,
  coursePath,
  ExternalLink,
} from "./ApiNavigation";
import { StudentTable } from "./StudentTable";

interface CourseDashboardProps {
  courseId: string;
  courseSlug: string;
}

const getErrorMessage = (reason: unknown): string =>
  reason instanceof CodeGradeApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : "Could not load the course gradebook.";

const titleFromSlug = (slug: string): string =>
  decodeURIComponent(slug)
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const CourseDashboard = ({
  courseId,
  courseSlug,
}: CourseDashboardProps) => {
  const { state, setState } = useApiSession();
  const controller = useRef<AbortController | null>(null);
  const courses = state.courses;
  const dashboard = getDashboardState(state, courseId);
  const loading = state.loading === `gradebook:${courseId}`;
  const error = state.error;
  const router = useRouter();
  const course = courses.find((item) => item.id === courseId);
  const courseName = course?.name ?? titleFromSlug(courseSlug);

  const loadGradebook = useCallback(async (force = false) => {
    if (!state.cacheHydrated) return;
    if (state.gradebooks[courseId] && !force) return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setState((current) => ({
      ...current,
      loading: `gradebook:${courseId}`,
      error: "",
    }));

    try {
      const gradebook = await fetchCourseGradebook(courseId, request.signal);
      if (request.signal.aborted) return;
      setState((current) => markApiDataFetched({
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
        loading: null,
        error: "",
      }));
    } catch (reason) {
      if (!request.signal.aborted) {
        setState((current) => ({
          ...current,
          connected:
            reason instanceof CodeGradeApiError && reason.status === 401
              ? false
              : current.connected,
          loading: null,
          error: getErrorMessage(reason),
        }));
      }
    } finally {
      if (!request.signal.aborted) {
        setState((current) =>
          current.loading === `gradebook:${courseId}`
            ? { ...current, loading: null }
            : current,
        );
      }
    }
  }, [
    courseId,
    setState,
    state.cacheHydrated,
    state.gradebooks,
  ]);

  useEffect(() => {
    void loadGradebook();
    return () => controller.current?.abort();
  }, [loadGradebook]);

  const studentHref = useMemo(
    () => (student: NonNullable<AppState["students"]>[number]) => {
      if (!student.CodeGradeId) return null;
      const params = new URLSearchParams({
        name: student.Name,
        username: student.Id,
      });
      return `${coursePath({ id: courseId, name: courseName })}/students/${encodeURIComponent(student.CodeGradeId)}?${params}`;
    },
    [courseId, courseName],
  );
  const assignments = state.gradebooks[courseId]?.assignments;
  const exerciseHref = useMemo(
    () => (exercise: Exercise) => {
      const assignment = assignments?.find(
        (item) => item.name === exercise.Title,
      );
      return assignment
        ? assignmentCodeGradeHref(courseId, assignment.id)
        : null;
    },
    [assignments, courseId],
  );

  return (
    <>
      <ApiHeader />
      <main className="app-shell api-page">
        <ApiBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "API", href: "/api" },
            { label: "Courses", href: "/api/courses" },
            { label: `Gradebook · ${courseName}` },
          ]}
        />
        <section className="page-heading">
          <div>
            <span className="eyebrow">
              <span className="eyebrow__dot" />
              Course gradebook
            </span>
            <h1>{courseName}</h1>
            <p>
              Course ID {courseId} · Student progress and assessment eligibility
            </p>
          </div>
          <div className="api-page-actions">
            <button
              className="text-button"
              onClick={() => void loadGradebook(true)}
              disabled={loading}
            >
              ↻ Reload gradebook
            </button>
            <ExternalLink
              href={courseCodeGradeHref(courseId)}
              label={`Open ${courseName} assignments in CodeGrade`}
            />
          </div>
        </section>

        {!state.connected && state.loading !== `gradebook:${courseId}` && error && (
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
            <strong>Couldn&apos;t load this gradebook</strong>
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <section className="api-load-state" aria-live="polite">
            <span className="api-load-state__spinner" aria-hidden="true" />
            <div>
              <strong>Loading students and assignment grades…</strong>
              <p>{courseName}</p>
            </div>
          </section>
        )}

        {dashboard.students && (
          <StudentTable
            state={dashboard}
            setState={(update) =>
              setState((current) => ({
                ...current,
                dashboards: {
                  ...current.dashboards,
                  [courseId]:
                    typeof update === "function"
                      ? update(getDashboardState(current, courseId))
                      : update,
                },
              }))
            }
            source="CodeGrade API"
            studentHref={studentHref}
            exerciseHref={exerciseHref}
            activityHref={`${coursePath({ id: courseId, name: courseName })}/activity`}
            onChangeGradebook={() => router.push("/api/courses")}
          />
        )}
      </main>
    </>
  );
};
