import { Dispatch, FC, SetStateAction } from "react";
import Link from "next/link";
import {
  AppState,
  Exercise,
  ExerciseFilter,
  Student,
  StudentFilters,
  SORT_OPTIONS,
  getStudentMetrics,
  isAssignmentTask,
  isChallenge,
  isCompleted,
  isProblemTask,
  initialFilters,
  matchesStudentFilters,
  scoreOf,
  sortValue,
} from "../Model";
import { ExternalLink } from "./ApiNavigation";

type FilterKey = keyof StudentFilters;
type ExerciseColumnKey =
  | "problemsTodo"
  | "problemsDone"
  | "assignmentsTodo"
  | "assignmentsDone";

interface ExerciseColumn {
  key: ExerciseColumnKey;
  title: string;
  matches: (exercise: Exercise) => boolean;
}

const exerciseColumns: ExerciseColumn[] = [
  {
    key: "problemsTodo",
    title: "Problems · to do",
    matches: (exercise) => isProblemTask(exercise) && !isCompleted(exercise),
  },
  {
    key: "problemsDone",
    title: "Problems · done",
    matches: (exercise) => isProblemTask(exercise) && isCompleted(exercise),
  },
  {
    key: "assignmentsTodo",
    title: "Assignments · to do",
    matches: (exercise) => isAssignmentTask(exercise) && !isCompleted(exercise),
  },
  {
    key: "assignmentsDone",
    title: "Assignments · done",
    matches: (exercise) => isAssignmentTask(exercise) && isCompleted(exercise),
  },
];

const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

const compareStudents =
  (sortBy: AppState["sortBy"], direction: AppState["sortDirection"]) =>
  (first: Student, second: Student): number => {
    const firstValue = sortValue(first, sortBy);
    const secondValue = sortValue(second, sortBy);
    const comparison =
      typeof firstValue === "string" && typeof secondValue === "string"
        ? firstValue.localeCompare(secondValue)
        : Number(firstValue) - Number(secondValue);

    return direction === "ASC" ? comparison : -comparison;
  };
const countActiveFilters = (filters: StudentFilters): number =>
  Object.values(filters).filter((value) => value !== null && value !== "" && value !== "all")
    .length;

const nextSortDirection = (
  state: AppState,
  key: AppState["sortBy"],
): AppState["sortDirection"] =>
  state.sortBy === key
    ? state.sortDirection === "ASC"
      ? "DESC"
      : "ASC"
    : key === "name"
      ? "ASC"
      : "DESC";

const exerciseGradeClass = (exercise: Exercise): string => {
  if (!isCompleted(exercise)) return "exercise-card__grade--todo";
  return scoreOf(exercise) >= 5.5
    ? "exercise-card__grade--passing"
    : "exercise-card__grade--below";
};

const exerciseGradeLabel = (exercise: Exercise): string =>
  isCompleted(exercise) ? scoreOf(exercise).toFixed(1) : "To do";
const isVisibleExercise = (
  exercise: Exercise,
  normalizedSearch: string,
  completedOnly: boolean,
): boolean =>
  (normalizedSearch.length === 0 ||
    exercise.Title.toLocaleLowerCase().includes(normalizedSearch)) &&
  (!completedOnly || isCompleted(exercise));

interface StudentTableProps {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  source?: string;
  studentHref?: (student: Student) => string | null;
  exerciseHref?: (exercise: Exercise) => string | null;
  onChangeGradebook?: () => void;
}

interface SortHeaderProps {
  label: string;
  sortBy: AppState["sortBy"];
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
}

const SortHeader: FC<SortHeaderProps> = ({
  label,
  sortBy,
  state,
  setState,
}) => (
  <th
    scope="col"
    aria-sort={
      state.sortBy === sortBy
        ? state.sortDirection === "ASC"
          ? "ascending"
          : "descending"
        : "none"
    }
  >
    <button
      className="student-table__sort"
      onClick={() =>
        setState((current) => ({
          ...current,
          sortBy,
          sortDirection: nextSortDirection(current, sortBy),
        }))
      }
    >
      {label}
      {state.sortBy === sortBy
        ? state.sortDirection === "ASC"
          ? " ↑"
          : " ↓"
        : ""}
    </button>
  </th>
);

export const StudentTable: FC<StudentTableProps> = ({
  state,
  setState,
  source = "CSV report",
  studentHref,
  exerciseHref,
  onChangeGradebook,
}) => {
  const students = state.students ?? [];
  const visibleStudents = students
    .filter((student) =>
      matchesStudentFilters(student, state.studentSearch, state.filters),
    )
    .sort(compareStudents(state.sortBy, state.sortDirection));
  const eligibleCount = students.filter(
    (student) => getStudentMetrics(student).eligible,
  ).length;
  const allGrades = students.flatMap((student) =>
    student.Exercises.filter(isCompleted).map(scoreOf),
  );
  const classAverage = allGrades.length
    ? allGrades.reduce((sum, score) => sum + score, 0) / allGrades.length
    : 0;
  const totalRequired = students.reduce(
    (sum, student) => sum + getStudentMetrics(student).totalRequired,
    0,
  );
  const completedRequired = students.reduce(
    (sum, student) => sum + getStudentMetrics(student).completedRequired,
    0,
  );
  const classCompletion = totalRequired
    ? Math.round((completedRequired / totalRequired) * 100)
    : 0;

  const setFilter = <K extends FilterKey>(key: K, value: StudentFilters[K]) => {
    setState((current) => ({
      ...current,
      filters: { ...current.filters, [key]: value },
    }));
  };

  const closeDashboard = () => {
    if (onChangeGradebook) {
      onChangeGradebook();
      return;
    }
    setState((current) => ({
      ...current,
      students: null,
      error: "",
      studentSearch: "",
      filtersOpen: false,
      filters: initialFilters(),
      sortBy: "averageGrade",
      sortDirection: "DESC",
      selectedStudentId: null,
      exerciseSearch: "",
      completedExercisesOnly: false,
    }));
  };

  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">
            <span className="eyebrow__dot" />
            Course progress · {source}
          </span>
          <h1>The class progress.</h1>
          <p>Find students who need support and track assessment readiness.</p>
        </div>
        <button className="text-button" onClick={closeDashboard}>
          <span aria-hidden="true">＋</span>
          Change gradebook
        </button>
      </section>

      <section className="summary-grid" aria-label="Class summary">
        <article className="summary-card summary-card--highlight">
          <span className="summary-card__icon" aria-hidden="true">◎</span>
          <div className="summary-card__label">Students in course</div>
          <div className="summary-card__value">{students.length}</div>
          <div className="summary-card__note">Showing the full gradebook</div>
        </article>
        <article className="summary-card">
          <span className="summary-card__icon" aria-hidden="true">✓</span>
          <div className="summary-card__label">Assessment eligible</div>
          <div className="summary-card__value">{eligibleCount}</div>
          <div className="summary-card__note">
            Every assignment and master at 5.5+
          </div>
        </article>
        <article className="summary-card">
          <span className="summary-card__icon" aria-hidden="true">↗</span>
          <div className="summary-card__label">Class average</div>
          <div className="summary-card__value">{classAverage.toFixed(1)}</div>
          <div className="summary-card__note">Across graded exercises</div>
        </article>
        <article className="summary-card">
          <span className="summary-card__icon" aria-hidden="true">◷</span>
          <div className="summary-card__label">Required work completed</div>
          <div className="summary-card__value">{classCompletion}%</div>
          <div className="summary-card__note">Optional tasks excluded</div>
        </article>
      </section>

      <section className="leaderboard" aria-labelledby="student-list-title">
        <div className="leaderboard__heading">
          <div>
            <h2 id="student-list-title">Students</h2>
            <p>
              {visibleStudents.length} of {students.length} students · click a
              student&apos;s details to inspect exercises
            </p>
          </div>
          <div className="leaderboard__tools">
            <input
              className="search-field"
              type="search"
              value={state.studentSearch}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  studentSearch: event.target.value,
                }))
              }
              placeholder="Search students..."
              aria-label="Search by student name or ID"
            />
            <button
              className={`filter-button${state.filtersOpen ? " filter-button--active" : ""}`}
              onClick={() =>
                setState((current) => ({
                  ...current,
                  filtersOpen: !current.filtersOpen,
                }))
              }
              aria-expanded={state.filtersOpen}
              aria-controls="student-filters"
            >
              <span aria-hidden="true">☷</span>
              Filters
              {countActiveFilters(state.filters) > 0 && (
                <span className="filter-button__count">
                  {countActiveFilters(state.filters)}
                </span>
              )}
            </button>
          </div>
        </div>

        {state.filtersOpen && (
          <section
            className="filter-panel"
            id="student-filters"
            aria-label="Filter students"
          >
            <div className="filter-panel__heading">
              <div>
                <h3>Filter students</h3>
                <p>Combine criteria to narrow down the class list.</p>
              </div>
              <button
                className="filter-panel__reset"
                onClick={() =>
                  setState((current) => ({
                    ...current,
                    filters: initialFilters(),
                  }))
                }
              >
                Clear filters
              </button>
            </div>
            <div className="filter-grid">
              <label className="filter-control">
                <span>Assessment eligibility</span>
                <select
                  value={state.filters.eligibility}
                  onChange={(event) =>
                    setFilter(
                      "eligibility",
                      event.target.value as StudentFilters["eligibility"],
                    )
                  }
                >
                  <option value="all">All students</option>
                  <option value="eligible">Eligible</option>
                  <option value="not-eligible">Not yet eligible</option>
                </select>
              </label>
              <label className="filter-control">
                <span>Assignment / exercise</span>
                <select
                  value={state.filters.exerciseTitle}
                  onChange={(event) =>
                    setFilter("exerciseTitle", event.target.value)
                  }
                >
                  <option value="">All exercises</option>
                  {Array.from(
                    new Set(
                      students
                        .flatMap((student) => student.Exercises)
                        .filter(isAssignmentTask)
                        .map((exercise) => exercise.Title),
                    ),
                  )
                    .sort((first, second) => first.localeCompare(second))
                    .map((title) => (
                      <option key={title} value={title}>
                        {title}
                      </option>
                    ))}
                </select>
              </label>
              <label className="filter-control">
                <span>Selected exercise status</span>
                <select
                  value={state.filters.exerciseStatus}
                  onChange={(event) =>
                    setFilter(
                      "exerciseStatus",
                      event.target.value as ExerciseFilter,
                    )
                  }
                  disabled={!state.filters.exerciseTitle}
                >
                  <option value="all">Any status</option>
                  <option value="done">Completed</option>
                  <option value="todo">To do</option>
                </select>
              </label>
              <label className="filter-control">
                <span>Sort students by</span>
                <select
                  value={state.sortBy}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      sortBy: event.target.value as AppState["sortBy"],
                    }))
                  }
                >
                  {SORT_OPTIONS.map(({ key, label }) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="filter-control">
                <span>Sort direction</span>
                <select
                  value={state.sortDirection}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      sortDirection: event.target.value as AppState["sortDirection"],
                    }))
                  }
                >
                  <option value="DESC">Highest first</option>
                  <option value="ASC">Lowest first</option>
                </select>
              </label>
              <NumberFilter
                label="Min average grade"
                value={state.filters.minAverageGrade}
                onChange={(value) => setFilter("minAverageGrade", value)}
                step="0.1"
              />
              <NumberFilter
                label="Max average grade"
                value={state.filters.maxAverageGrade}
                onChange={(value) => setFilter("maxAverageGrade", value)}
                step="0.1"
              />
              <NumberFilter
                label="Min completed assignments"
                value={state.filters.minCompletedAssignments}
                onChange={(value) => setFilter("minCompletedAssignments", value)}
                min="0"
                step="1"
              />
              <NumberFilter
                label="Max completed assignments"
                value={state.filters.maxCompletedAssignments}
                onChange={(value) => setFilter("maxCompletedAssignments", value)}
                min="0"
                step="1"
              />
              <NumberFilter
                label="Min completed problems"
                value={state.filters.minCompletedProblems}
                onChange={(value) => setFilter("minCompletedProblems", value)}
                min="0"
                step="1"
              />
              <NumberFilter
                label="Max completed problems"
                value={state.filters.maxCompletedProblems}
                onChange={(value) => setFilter("maxCompletedProblems", value)}
                min="0"
                step="1"
              />
              <NumberFilter
                label="Min required work complete (%)"
                value={state.filters.minCompletion}
                onChange={(value) => setFilter("minCompletion", value)}
                min="0"
                max="100"
                step="1"
              />
              <NumberFilter
                label="Max required work complete (%)"
                value={state.filters.maxCompletion}
                onChange={(value) => setFilter("maxCompletion", value)}
                min="0"
                max="100"
                step="1"
              />
            </div>
          </section>
        )}

        <div className="table-scroll">
          <table className="student-table">
            <thead>
              <tr>
                <SortHeader label="Student" sortBy="name" state={state} setState={setState} />
                <SortHeader label="Required progress" sortBy="completion" state={state} setState={setState} />
                <SortHeader label="Assignments" sortBy="completedAssignments" state={state} setState={setState} />
                <SortHeader label="Challenge" sortBy="completedChallenges" state={state} setState={setState} />
                <SortHeader label="Problems" sortBy="completedProblems" state={state} setState={setState} />
                <SortHeader label="Optional" sortBy="completedOptional" state={state} setState={setState} />
                <SortHeader label="Master" sortBy="masterGrade" state={state} setState={setState} />
                <SortHeader label="Avg. grade" sortBy="averageGrade" state={state} setState={setState} />
                <SortHeader label="Go" sortBy="eligibility" state={state} setState={setState} />
                <th scope="col">
                  <span className="visually-hidden">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((student) => (
                <StudentRow
                  key={`${student.Id}-${student.Name}`}
                  student={student}
                  state={state}
                  setState={setState}
                  href={studentHref?.(student) ?? null}
                  exerciseHref={exerciseHref}
                />
              ))}
              {visibleStudents.length === 0 && (
                <tr>
                  <td colSpan={10} className="table-empty">
                    No students match the current search and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="dashboard-footer">
          <span>
            Eligible students have every assignment and the master assignment
            graded 5.5 or higher, and any Challenge exercise completed.
          </span>
          <span>
            {source === "CSV report"
              ? "CSV is processed locally in your browser"
              : "Data fetched directly from CodeGrade"}
          </span>
        </div>
      </section>
    </>
  );
};
interface NumberFilterProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: string;
  max?: string;
  step: string;
}

const NumberFilter: FC<NumberFilterProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
}) => (
  <label className="filter-control">
    <span>{label}</span>
    <input
      type="number"
      value={value ?? ""}
      onChange={(event) => {
        const nextValue =
          event.target.value === "" ? null : Number(event.target.value);
        if (nextValue === null || Number.isFinite(nextValue)) onChange(nextValue);
      }}
      min={min}
      max={max}
      step={step}
      placeholder="Any"
    />
  </label>
);

interface StudentRowProps {
  student: Student;
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  href: string | null;
  exerciseHref?: (exercise: Exercise) => string | null;
}

const StudentRow: FC<StudentRowProps> = ({
  student,
  state,
  setState,
  href,
  exerciseHref,
}) => {
  const metrics = getStudentMetrics(student);
  const expanded = state.selectedStudentId === student.Id;

  return (
    <>
      <tr className={`student-row${expanded ? " student-row--expanded" : ""}`}>
        <td>
          <div className="student-name">
            <span className="student-name__avatar" aria-hidden="true">
              {getInitials(student.Name)}
            </span>
            <span className="student-name__text">
              {href ? (
                <Link
                  className="student-name__link"
                  href={href}
                >
                  {student.Name || "Unnamed student"}
                </Link>
              ) : (
                <span className="student-name__primary">
                  {student.Name || "Unnamed student"}
                </span>
              )}
              <span className="student-name__secondary">ID {student.Id}</span>
            </span>
          </div>
        </td>
        <td>
          <div className="progress-cell">
            <div className="progress-cell__meta">
              <span>
                {metrics.completedRequired} of {metrics.totalRequired} required
              </span>
              <strong>{metrics.completion}%</strong>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={`${student.Name} required work completed`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={metrics.completion}
            >
              <div
                className="progress-track__fill"
                style={{ width: `${metrics.completion}%` }}
              />
            </div>
          </div>
        </td>
        <td className="count-cell">
          {metrics.completedAssignments}/{metrics.totalAssignments}
        </td>
        <td className="count-cell">
          {metrics.completedChallenges}/{metrics.totalChallenges}
        </td>
        <td className="count-cell">
          {metrics.completedProblems}/{metrics.totalProblems}
        </td>
        <td className="count-cell">
          {metrics.completedOptional}/{metrics.totalOptional}
        </td>
        <td className="grade-cell">
          {metrics.masterGrade < 0 ? "—" : metrics.masterGrade.toFixed(1)}
        </td>
        <td className="grade-cell">{metrics.averageGrade.toFixed(1)}</td>
        <td>
          <span
            className={`status-pill${metrics.eligible ? " status-pill--eligible" : " status-pill--not-eligible"}`}
          >
            {metrics.eligible ? "Eligible" : "Not yet"}
          </span>
        </td>
        <td>
          <button
            className="details-toggle"
            onClick={() =>
              setState((current) => ({
                ...current,
                selectedStudentId: expanded ? null : student.Id,
                exerciseSearch: "",
                completedExercisesOnly: false,
              }))
            }
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "View"} ${student.Name} exercise details`}
          >
            {expanded ? "Hide" : "Details"} {expanded ? "↑" : "↓"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="details-row">
          <td colSpan={10}>
            <ExerciseDetails
              student={student}
              state={state}
              setState={setState}
              exerciseHref={exerciseHref}
            />
          </td>
        </tr>
      )}
    </>
  );
};

interface ExerciseDetailsProps {
  student: Student;
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  exerciseHref?: (exercise: Exercise) => string | null;
}

const ExerciseDetails: FC<ExerciseDetailsProps> = ({
  student,
  state,
  setState,
  exerciseHref,
}) => {
  const normalizedSearch = state.exerciseSearch.trim().toLocaleLowerCase();
  const exercises = student.Exercises.filter(
    (exercise) =>
      isVisibleExercise(
        exercise,
        normalizedSearch,
        state.completedExercisesOnly,
      ),
  );

  return (
    <section className="student-details" aria-label={`${student.Name} exercise details`}>
      <div className="student-details__heading">
        <div>
          <h3>Exercise breakdown</h3>
          <span className="student-details__hint">
            {exercises.length} of {student.Exercises.length} exercises
          </span>
        </div>
        <div className="student-details__tools">
          <input
            className="search-field"
            type="search"
            value={state.exerciseSearch}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                exerciseSearch: event.target.value,
              }))
            }
            placeholder="Search exercises..."
            aria-label={`Search ${student.Name} exercises`}
          />
          <label className="completed-toggle">
            <input
              type="checkbox"
              checked={state.completedExercisesOnly}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  completedExercisesOnly: event.target.checked,
                }))
              }
            />
            <span>Completed only</span>
          </label>
        </div>
      </div>
      <div className="exercise-columns">
        {exerciseColumns.map((column) => {
          const matchingExercises = exercises.filter(column.matches);

          return (
            <section className="exercise-column" key={column.key}>
              <h4>
                <span>{column.title}</span>
                <span className="exercise-column__count">
                  {matchingExercises.length}
                </span>
              </h4>
              {matchingExercises.length > 0 ? (
                <ul className="student-details__list">
                  {matchingExercises.map((exercise, index) => {
                    const href = exerciseHref?.(exercise);

                    return (
                      <li
                        className="exercise-card"
                        key={`${exercise.Title}-${index}`}
                      >
                        <div className="exercise-card__title">
                          <strong>{exercise.Title || "Untitled exercise"}</strong>
                          {isChallenge(exercise) && (
                            <span className="exercise-card__type">
                              Challenge
                            </span>
                          )}
                          {href && (
                            <ExternalLink
                              href={href}
                              label={`Open ${exercise.Title} in CodeGrade`}
                            />
                          )}
                        </div>
                        <span className={`exercise-card__grade ${exerciseGradeClass(exercise)}`}>
                          {exerciseGradeLabel(exercise)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="exercise-column__empty">No matching exercises</p>
              )}
            </section>
          );
        })}
      </div>
      <p className="student-details__note">
        Optional and unclassified exercises are grouped with problems.
      </p>
    </section>
  );
};
