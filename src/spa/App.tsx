"use client";

import Link from "next/link";
import { useState } from "react";
import { Either, Left, Right } from "@/utils/Either";
import { FileInput } from "./components/FileInput";
import { StudentTable } from "./components/StudentTable";

export interface Exercise {
  Title: string;
  Score: Either<string, number>;
}

export interface Student {
  Id: string;
  Name: string;
  Exercises: Exercise[];
}

export type SortBy =
  | "name"
  | "problems"
  | "assignment"
  | "optional"
  | "master_grade"
  | "grade"
  | "avg_grade_cumulative";
export type SortDirection = "ASC" | "DESC";

const parseCsvRows = (input: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const text = input.replace(/^\uFEFF/, "");

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n" || character === "\r") {
      row.push(cell);
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
      if (character === "\r" && text[index + 1] === "\n") index += 1;
    } else {
      cell += character;
    }
  }

  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
};

const parseStudents = (input: string): Student[] => {
  const [header, ...rows] = parseCsvRows(input);
  if (!header || header.length < 2) {
    throw new Error("This file does not look like a CodeGrade gradebook CSV.");
  }

  const exerciseTitles = header.slice(2);
  const students = rows
    .filter((row) => row.some((value) => value.trim().length > 0))
    .map((row, rowIndex) => {
      if (row.length < 2) {
        throw new Error(`Student row ${rowIndex + 2} is missing a name or ID.`);
      }

      return {
        Name: row[0].trim(),
        Id: row[1].trim(),
        Exercises: exerciseTitles.map((title, index) => {
          const value = (row[index + 2] ?? "").trim();
          const score = Number(value);
          return {
            Title: title,
            Score:
              value !== "" && Number.isFinite(score)
                ? Right<string, number>(score)
                : Left<string, number>(value),
          };
        }),
      };
    });

  if (students.length === 0) {
    throw new Error("No student rows were found in this gradebook.");
  }

  return students;
};

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
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState("");

  const loadFile = (content: string) => {
    try {
      setStudents(parseStudents(content));
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The gradebook could not be read. Please choose another CSV file.",
      );
    }
  };

  return (
    <>
      <AppHeader />
      <main className="app-shell">
        {students ? (
          <StudentTable
            students={students}
            onChooseAnother={() => {
              setStudents(null);
              setError("");
            }}
          />
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
            <FileInput onFileLoad={loadFile} onError={setError} error={error} />
          </>
        )}
      </main>
    </>
  );
};