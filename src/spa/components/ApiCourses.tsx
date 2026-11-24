"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { initialApiAppState, useApiSession } from "../ApiTokenContext";
import {
  CodeGradeApiError,
  disconnectCodeGrade,
  fetchCourses,
} from "../CodeGradeApi";
import {
  ApiBreadcrumbs,
  ApiHeader,
  courseCodeGradeHref,
  coursePath,
  ExternalLink,
} from "./ApiNavigation";

const errorMessage = (reason: unknown): string =>
  reason instanceof CodeGradeApiError
    ? reason.message
    : reason instanceof Error
      ? reason.message
      : "Could not load the course list.";

export const ApiCourses = () => {
  const { state, setState } = useApiSession();
  const controller = useRef<AbortController | null>(null);

  const reload = async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const requestSignal = request.signal;
    setState((current) => ({ ...current, loading: "courses", error: "" }));

    try {
      const results = await fetchCourses(requestSignal);
      if (requestSignal.aborted) return;
      setState((current) => ({
        ...current,
        connected: true,
        courses: results,
        loading: null,
        error: results.length === 0 ? "No courses were returned." : "",
      }));
    } catch (reason) {
      if (!requestSignal.aborted) {
        setState((current) => ({
          ...current,
          connected: reason instanceof CodeGradeApiError && reason.status === 401
            ? false
            : current.connected,
          loading: null,
          error: errorMessage(reason),
        }));
      }
    } finally {
      if (!requestSignal.aborted) {
        setState((current) =>
          current.loading === "courses"
            ? { ...current, loading: null }
            : current,
        );
      }
    }
  };

  const disconnect = async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setState((current) => ({ ...current, loading: "disconnect", error: "" }));
    try {
      await disconnectCodeGrade(request.signal);
      if (!request.signal.aborted) setState(initialApiAppState());
    } catch (reason) {
      if (!request.signal.aborted) {
        setState((current) => ({
          ...current,
          loading: null,
          error: errorMessage(reason),
        }));
      }
    }
  };

  useEffect(() => {
    if (state.courses.length > 0) return;
    void reload();
    return () => controller.current?.abort();
  }, []);

  return (
    <>
      <ApiHeader />
      <main className="app-shell api-page">
        <ApiBreadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "API", href: "/api" },
            { label: "Courses" },
          ]}
        />
        <section className="page-heading">
          <div>
            <span className="eyebrow">
              <span className="eyebrow__dot" />
              Your CodeGrade account
            </span>
            <h1>Choose a course.</h1>
            <p>
              Open a gradebook in this dashboard or jump to its assignments in
              CodeGrade.
            </p>
          </div>
          <div className="api-page-actions">
            <button
              className="text-button"
              onClick={() => void reload()}
              disabled={state.loading !== null}
            >
              ↻ Refresh courses
            </button>
            <Link className="text-button" href="/api">
              Change token
            </Link>
            <button
              className="text-button"
              onClick={() => void disconnect()}
              disabled={state.loading !== null}
            >
              Disconnect
            </button>
          </div>
        </section>

        {state.error && (
          <div className="api-error" role="alert">
            <strong>Couldn&apos;t load your courses</strong>
            <span>{state.error}</span>
          </div>
        )}

        {state.loading === "courses" && (
          <section className="api-load-state" aria-live="polite">
            <span className="api-load-state__spinner" aria-hidden="true" />
            <div>
              <strong>Refreshing courses…</strong>
              <p>Contacting CodeGrade through the local server.</p>
            </div>
          </section>
        )}

        {!state.connected && state.loading !== "courses" ? (
          <section className="api-empty-state">
            <h2>Reconnect to view your courses</h2>
            <p>
              Your CodeGrade session has expired or is not connected. Connect
              again to refresh this course list.
            </p>
            <Link className="api-primary-button" href="/api">
              Connect to CodeGrade
            </Link>
          </section>
        ) : state.courses.length > 0 ? (
          <section className="api-course-section" aria-labelledby="course-title">
            <div className="api-section-heading">
              <div>
                <span className="eyebrow">Available gradebooks</span>
                <h2 id="course-title">Your courses</h2>
              </div>
              <span>{state.courses.length} courses</span>
            </div>
            <div className="api-course-list">
              {state.courses.map((course) => (
                <article className="api-course-card" key={course.id}>
                  <Link
                    className="api-course-card__main"
                    href={coursePath(course)}
                  >
                    <span className="api-course-card__icon" aria-hidden="true">
                      ◫
                    </span>
                    <span className="api-course-card__text">
                      <strong>{course.name}</strong>
                      <small>Course ID {course.id} · Open gradebook</small>
                    </span>
                    <span className="api-course-card__arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                  <ExternalLink
                    href={courseCodeGradeHref(course.id)}
                    label={`Open ${course.name} assignments in CodeGrade`}
                  />
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="api-empty-state">
            <h2>No courses loaded yet</h2>
            <p>Refresh your course list or reconnect with your token.</p>
            <button
              className="api-primary-button"
              onClick={() => void reload()}
              disabled={state.loading !== null}
            >
              Load courses
            </button>
          </section>
        )}
      </main>
    </>
  );
};
