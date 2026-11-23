"use client";

import Link from "next/link";
import { Dispatch, SetStateAction, useState } from "react";
import { FileInput } from "./components/FileInput";
import { StudentTable } from "./components/StudentTable";
import {
  AppState,
  initialAppState,
  parseStudents,
} from "./Model";

export type AppStateSetter = Dispatch<SetStateAction<AppState>>;

const AppHeader = () => (
  <header className="app-header">
    <Link className="brand" href="/" aria-label="Gradeboard home">
      <span className="brand__mark">g</span>
      <span>gradeboard</span>
      <span className="brand__sub">for CodeGrade</span>
    </Link>
    <nav className="app-nav" aria-label="Main navigation">
      <Link className="app-nav__link app-nav__link--active" href="/">
        CSV dashboard
      </Link>
      <Link className="app-nav__link" href="/api">
        API view
      </Link>
    </nav>
  </header>
);

export const App = () => {
  const [state, setState] = useState<AppState>(initialAppState);

  const loadFile = (content: string) => {
    try {
      setState((current) => ({
        ...current,
        students: parseStudents(content),
        error: "",
      }));
    } catch (reason) {
      setState((current) => ({
        ...current,
        error:
          reason instanceof Error
            ? reason.message
            : "The gradebook could not be read. Please choose another CSV file.",
      }));
    }
  };

  return (
    <>
      <AppHeader />
      <main className="app-shell">
        {state.students ? (
          <StudentTable state={state} setState={setState} />
        ) : (
          <>
            <section className="page-heading">
              <div>
                <span className="eyebrow">
                  <span className="eyebrow__dot" />
                  Your course at a glance
                </span>
                <h1>Progress, made clear.</h1>
                <p>
                  Turn a CodeGrade gradebook into a focused view of student
                  progress and assessment eligibility.
                </p>
              </div>
            </section>
            <FileInput
              onFileLoad={loadFile}
              onError={(error) =>
                setState((current) => ({ ...current, error }))
              }
              error={state.error}
            />
          </>
        )}
      </main>
    </>
  );
};
