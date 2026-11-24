"use client";

import Link from "next/link";
import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CodeGradeApiError,
  CodeGradeCourse,
  fetchCourses,
  fetchCourseStudents,
} from "../CodeGradeApi";
import { AppState, initialAppState } from "../Model";
import { StudentTable } from "./StudentTable";

type LoadStatus = "idle" | "courses" | "gradebook";

interface ApiViewState {
  token: string;
  courses: CodeGradeCourse[];
  selectedCourse: CodeGradeCourse | null;
  status: LoadStatus;
  error: string;
  dashboard: AppState;
}

const initialApiState = (): ApiViewState => ({
  token: "",
  courses: [],
  selectedCourse: null,
  status: "idle",
  error: "",
  dashboard: initialAppState(),
});

const normalizeToken = (token: string): string =>
  token.trim().replace(/^Bearer\s+/i, "");

const getErrorMessage = (reason: unknown): string => {
  if (reason instanceof CodeGradeApiError) return reason.message;
  if (reason instanceof Error) return reason.message;
  return "The CodeGrade request failed. Please try again.";
};

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

export const ApiDashboard = () => {
  const [state, setState] = useState<ApiViewState>(initialApiState);
  const controller = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );

  const startRequest = () => {
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    return nextController;
  };

  const loadCourseList = async (
    event?: FormEvent<HTMLFormElement>,
    tokenInput = state.token,
  ) => {
    event?.preventDefault();
    const token = normalizeToken(tokenInput);
    if (!token) {
      setState((current) => ({
        ...current,
        error: "Enter a CodeGrade bearer token to continue.",
      }));
      return;
    }

    const request = startRequest();
    setState((current) => ({
      ...current,
      token,
      courses: [],
      selectedCourse: null,
      status: "courses",
      error: "",
      dashboard: initialAppState(),
    }));

    try {
      const courses = await fetchCourses(token, request.signal);
      setState((current) =>
        request.signal.aborted
          ? current
          : {
              ...current,
              courses,
              status: "idle",
              error:
                courses.length === 0
                  ? "No courses were returned for this token."
                  : "",
            },
      );
    } catch (reason) {
      if (!request.signal.aborted) {
        setState((current) => ({
          ...current,
          status: "idle",
          error: getErrorMessage(reason),
        }));
      }
    }
  };

  const loadCourse = async (course: CodeGradeCourse) => {
    const token = normalizeToken(state.token);
    if (!token) {
      setState((current) => ({
        ...current,
        error: "Enter a CodeGrade bearer token before selecting a course.",
      }));
      return;
    }

    const request = startRequest();
    setState((current) => ({
      ...current,
      selectedCourse: course,
      status: "gradebook",
      error: "",
      dashboard: {
        ...initialAppState(),
        sortBy: current.dashboard.sortBy,
        sortDirection: current.dashboard.sortDirection,
      },
    }));

    try {
      const students = await fetchCourseStudents(course.id, token, request.signal);

      setState((current) =>
        request.signal.aborted
          ? current
          : {
              ...current,
              status: "idle",
              dashboard: {
                ...current.dashboard,
                students,
                error: "",
              },
            },
      );
    } catch (reason) {
      if (!request.signal.aborted) {
        setState((current) => ({
          ...current,
          status: "idle",
          error: getErrorMessage(reason),
        }));
      }
    }
  };

  const setDashboardState: Dispatch<SetStateAction<AppState>> = (update) => {
    setState((current) => ({
      ...current,
      dashboard:
        typeof update === "function"
          ? update(current.dashboard)
          : update,
    }));
  };

  const isLoading = state.status !== "idle";

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
              Connect with a bearer token, choose a course, and explore its
              assignment grades.
            </p>
          </div>
          <span className={`api-status${state.courses.length ? " api-status--connected" : ""}`}>
            <span className="api-status__dot" />
            {state.courses.length ? "Courses loaded" : "API not connected"}
          </span>
        </section>

        <section className="api-connection" aria-labelledby="token-title">
          <div className="api-connection__intro">
            <span className="api-connection__icon" aria-hidden="true">⌁</span>
            <div>
              <h2 id="token-title">Connect to CodeGrade</h2>
              <p>
                Your token stays in this page&apos;s memory and is sent to this
                local Next.js server. The server contacts CodeGrade.
              </p>
            </div>
          </div>
          <form
            className="api-token-form"
            onSubmit={(event) => void loadCourseList(event)}
          >
            <label htmlFor="codegrade-token">Bearer token</label>
            <div className="api-token-form__controls">
              <input
                id="codegrade-token"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={state.token}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    token: event.target.value,
                    error: "",
                  }))
                }
                placeholder="Paste your CodeGrade bearer token"
                aria-describedby="token-note"
              />
              <button
                className="api-primary-button"
                type="submit"
                disabled={isLoading}
              >
                {state.courses.length ? "Update token" : "Load my courses"}
              </button>
              {state.courses.length > 0 && (
                <button
                  className="text-button api-reload-button"
                  type="button"
                  onClick={() =>
                    state.selectedCourse
                      ? void loadCourse(state.selectedCourse)
                      : void loadCourseList(undefined, state.token)
                  }
                  disabled={isLoading}
                  aria-label="Reload CodeGrade data"
                >
                  ↻ Reload
                </button>
              )}
            </div>
            <p id="token-note" className="api-token-form__note">
              The token is not saved to cookies or local storage. For security,
              avoid using a shared computer.
            </p>
          </form>
        </section>

        {state.error && (
          <div className="api-error" role="alert">
            <strong>Couldn&apos;t load CodeGrade data</strong>
            <span>{state.error}</span>
            <span className="api-error__hint">
              The token is only held in page memory. Update it or reload the
              selected course to retry.
            </span>
          </div>
        )}

        {isLoading && (
          <section className="api-load-state" aria-live="polite">
            <span className="api-load-state__spinner" aria-hidden="true" />
            <div>
              <strong>
                {state.status === "courses"
                  ? "Loading your courses…"
                  : "Loading assignments and grades…"}
              </strong>
              <p>
                {state.selectedCourse?.name ??
                  "Contacting the local CodeGrade service."}
              </p>
            </div>
          </section>
        )}

        {state.courses.length > 0 && (
          <section className="api-course-section" aria-labelledby="course-title">
            <div className="api-section-heading">
              <div>
                <span className="eyebrow">Your CodeGrade account</span>
                <h2 id="course-title">Choose a course</h2>
              </div>
              <span>{state.courses.length} courses</span>
            </div>
            <div className="api-course-list">
              {state.courses.map((course) => (
                <button
                  className={`api-course-card${state.selectedCourse?.id === course.id ? " api-course-card--selected" : ""}`}
                  key={course.id}
                  onClick={() => void loadCourse(course)}
                  disabled={isLoading}
                  aria-pressed={state.selectedCourse?.id === course.id}
                >
                  <span className="api-course-card__icon" aria-hidden="true">
                    ◫
                  </span>
                  <span className="api-course-card__text">
                    <strong>{course.name}</strong>
                    <small>Course ID {course.id}</small>
                  </span>
                  <span className="api-course-card__arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {state.selectedCourse && !isLoading && !state.error && (
          <section className="api-selected-course" aria-live="polite">
            <span className="eyebrow">Selected course</span>
            <h2>{state.selectedCourse.name}</h2>
            <p>
              {state.dashboard.students?.length ?? 0} students · assignment
              grades fetched by the local server from CodeGrade
            </p>
          </section>
        )}

        {state.dashboard.students && !isLoading && (
          <StudentTable
            state={state.dashboard}
            setState={setDashboardState}
            source="CodeGrade API"
          />
        )}
      </main>
    </>
  );
};
