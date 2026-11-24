"use client";

import {
  FormEvent,
  useEffect,
  useRef,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  initialApiAppState,
  useApiSession,
} from "../ApiTokenContext";
import {
  CodeGradeApiError,
  connectCodeGrade,
  fetchCourses,
} from "../CodeGradeApi";
import { ApiBreadcrumbs, ApiHeader } from "./ApiNavigation";

const normalizeToken = (token: string): string =>
  token.trim().replace(/^Bearer\s+/i, "");

const getErrorMessage = (reason: unknown): string => {
  if (reason instanceof CodeGradeApiError) return reason.message;
  if (reason instanceof Error) return reason.message;
  return "The CodeGrade request failed. Please try again.";
};

export const ApiDashboard = () => {
  const router = useRouter();
  const { state, setState } = useApiSession();
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if (state.connected) return;
    const request = new AbortController();
    controller.current = request;
    void fetchCourses(request.signal)
      .then((courses) => {
        if (request.signal.aborted) return;
        setState((current) => ({
          ...current,
          connected: true,
          courses,
          error: "",
        }));
      })
      .catch((reason: unknown) => {
        if (
          !request.signal.aborted &&
          (!(reason instanceof CodeGradeApiError) || reason.status !== 401)
        ) {
          setState((current) => ({
            ...current,
            error: getErrorMessage(reason),
          }));
        }
      });
    return () => request.abort();
  }, []);

  const connect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const bearerToken = normalizeToken(state.tokenDraft);
    if (!bearerToken) {
      setState((current) => ({
        ...current,
        error: "Enter a CodeGrade bearer token to continue.",
      }));
      return;
    }

    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setState((current) => ({
      ...current,
      loading: "connect",
      error: "",
    }));

    try {
      const courses = await connectCodeGrade(bearerToken, request.signal);
      if (request.signal.aborted) return;
      if (courses.length === 0) {
        setState({
          ...initialApiAppState(),
          connected: true,
          error: "No courses were returned for this token.",
        });
        return;
      }
      setState({
        ...initialApiAppState(),
        connected: true,
        courses,
      });
      router.push("/api/courses");
    } catch (reason) {
      if (!request.signal.aborted) {
        setState((current) => ({
          ...current,
          loading: null,
          error: getErrorMessage(reason),
        }));
      }
    } finally {
      if (!request.signal.aborted) {
        setState((current) =>
          current.loading === "connect"
            ? { ...current, loading: null }
            : current,
        );
      }
    }
  };

  return (
    <>
      <ApiHeader />
      <main className="app-shell api-page">
        <ApiBreadcrumbs
          items={[{ label: "Home", href: "/" }, { label: "API" }]}
        />
        <section className="page-heading">
          <div>
            <span className="eyebrow">
              <span className="eyebrow__dot" />
              Live course data
            </span>
            <h1>Connect to CodeGrade.</h1>
            <p>
              Enter your bearer token to load your courses and explore student
              progress.
            </p>
          </div>
        </section>

        <section className="api-connection" aria-labelledby="token-title">
          <div className="api-connection__intro">
            <span className="api-connection__icon" aria-hidden="true">⌁</span>
            <div>
              <h2 id="token-title">Connect to CodeGrade</h2>
              <p>
                Your token is validated by the local server and stored in an
                HttpOnly cookie. It is not exposed to browser JavaScript.
              </p>
            </div>
          </div>
          {state.connected && (
            <Link className="text-button" href="/api/courses">
              View your courses →
            </Link>
          )}
          <form className="api-token-form" onSubmit={(event) => void connect(event)}>
            <label htmlFor="codegrade-token">Bearer token</label>
            <div className="api-token-form__controls">
              <input
                id="codegrade-token"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={state.tokenDraft}
                onChange={(event) => {
                  setState((current) => ({
                    ...current,
                    tokenDraft: event.target.value,
                    error: "",
                  }));
                }}
                placeholder="Paste your CodeGrade bearer token"
              />
              <button
                className="api-primary-button"
                type="submit"
                disabled={state.loading === "connect"}
              >
                {state.loading === "connect" ? "Connecting…" : "Load my courses"}
              </button>
            </div>
          </form>
        </section>

        {state.error && (
          <div className="api-error" role="alert">
            <strong>Couldn&apos;t connect to CodeGrade</strong>
            <span>{state.error}</span>
          </div>
        )}

        {state.loading === "connect" && (
          <section className="api-load-state" aria-live="polite">
            <span className="api-load-state__spinner" aria-hidden="true" />
            <div>
              <strong>Loading your courses…</strong>
              <p>Contacting CodeGrade through the local server.</p>
            </div>
          </section>
        )}
      </main>
    </>
  );
};
