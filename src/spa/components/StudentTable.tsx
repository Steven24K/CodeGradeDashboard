import { FC, useMemo, useState } from "react";
import { Exercise, SortBy, SortDirection, Student } from "../App";

const isProblem = (exercise: Exercise) =>
  /^A\dW\d+P\d+/.test(exercise.Title);
const isAssignment = (exercise: Exercise) =>
  /^A\dW\d+A\d+/.test(exercise.Title);
const isOptional = (exercise: Exercise) =>
  /^A\dW\d+O\d+/.test(exercise.Title);
const isMaster = (exercise: Exercise) =>
  /^A\dW\d+M\d+/.test(exercise.Title);
const isCompleted = (exercise: Exercise) => exercise.Score.kind === "right";
const isGradeSufficient = (exercise: Exercise) =>
  exercise.Score.kind === "right" && exercise.Score.v >= 5.5;
const scoreOf = (exercise: Exercise) =>
  exercise.Score.kind === "right" ? exercise.Score.v : 0;
const average = (scores: number[]) =>
  scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
const completion = (exercises: Exercise[]) => {
  const required = exercises.filter((exercise) => !isOptional(exercise));
  return {
    completed: required.filter(isCompleted).length,
    total: required.length,
    percent: required.length
      ? Math.round((required.filter(isCompleted).length / required.length) * 100)
      : 0,
  };
};
const grade = (student: Student) =>
  average(student.Exercises.filter(isCompleted).map(scoreOf));
const master = (student: Student) => student.Exercises.find(isMaster);
const masterGrade = (student: Student) => {
  const exercise = master(student);
  return exercise ? scoreOf(exercise) : -1;
};
const displayGrade = (value: number) => value.toFixed(1);
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();

interface StudentTableProps {
  students: Student[];
  onChooseAnother: () => void;
}

interface SortState {
  key: SortBy;
  direction: SortDirection;
}

const sortValue = (student: Student, key: SortBy): number | string => {
  switch (key) {
    case "name":
      return student.Name.toLocaleLowerCase();
    case "problems":
      return student.Exercises.filter((exercise) => isProblem(exercise) && isCompleted(exercise)).length;
    case "assignment":
      return student.Exercises.filter((exercise) => isAssignment(exercise) && isCompleted(exercise)).length;
    case "optional":
      return student.Exercises.filter((exercise) => isOptional(exercise) && isCompleted(exercise)).length;
    case "master_grade":
      return masterGrade(student);
    case "avg_grade_cumulative":
      return average(student.Exercises.map(scoreOf));
    case "grade":
      return grade(student);
  }
};

const SortHeading: FC<{
  label: string;
  sortKey: SortBy;
  state: SortState;
  onSort: (key: SortBy) => void;
}> = ({ label, sortKey, state, onSort }) => (
  <th aria-sort={state.key === sortKey ? (state.direction === "ASC" ? "ascending" : "descending") : "none"}>
    <button className="student-table__sort" onClick={() => onSort(sortKey)}>
      {label}
      {state.key === sortKey ? (state.direction === "ASC" ? " ↑" : " ↓") : ""}
    </button>
  </th>
);

export const StudentTable: FC<StudentTableProps> = ({
  students,
  onChooseAnother,
}) => {
  const [sort, setSort] = useState<SortState>({
    key: "grade",
    direction: "DESC",
  });
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");

  const filteredStudents = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return students
      .filter(
        (student) =>
          search.length === 0 ||
          student.Name.toLocaleLowerCase().includes(search) ||
          student.Id.toLocaleLowerCase().includes(search),
      )
      .sort((first, second) => {
        const firstValue = sortValue(first, sort.key);
        const secondValue = sortValue(second, sort.key);
        const comparison =
          typeof firstValue === "string" && typeof secondValue === "string"
            ? firstValue.localeCompare(secondValue)
            : Number(firstValue) - Number(secondValue);
        return sort.direction === "ASC" ? comparison : -comparison;
      });
  }, [query, sort, students]);

  const classMetrics = useMemo(() => {
    const eligible = students.filter((student) => {
      const exercise = master(student);
      return exercise ? isGradeSufficient(exercise) : false;
    }).length;
    const allRequired = students.flatMap((student) =>
      student.Exercises.filter((exercise) => !isOptional(exercise)),
    );
    const completedRequired = allRequired.filter(isCompleted).length;
    const grades = students.flatMap((student) =>
      student.Exercises.filter(isCompleted).map(scoreOf),
    );

    return {
      eligible,
      averageGrade: average(grades),
      completionPercent: allRequired.length
        ? Math.round((completedRequired / allRequired.length) * 100)
        : 0,
    };
  }, [students]);

  const onSort = (key: SortBy) => {
    setSort((current) => ({
      key,
      direction:
        current.key === key
          ? current.direction === "ASC"
            ? "DESC"
            : "ASC"
          : key === "name"
            ? "ASC"
            : "DESC",
    }));
  };

  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">
            <span className="eyebrow__dot" />
            Course progress · CSV report
          </span>
          <h1>The class leaderboard.</h1>
          <p>Track progress, compare results, and spot assessment-ready students.</p>
        </div>
        <button className="text-button" onClick={onChooseAnother}>
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
          <div className="summary-card__value">{classMetrics.eligible}</div>
          <div className="summary-card__note">Master assignment score of 5.5+</div>
        </article>
        <article className="summary-card">
          <span className="summary-card__icon" aria-hidden="true">↗</span>
          <div className="summary-card__label">Class average</div>
          <div className="summary-card__value">
            {displayGrade(classMetrics.averageGrade)}
          </div>
          <div className="summary-card__note">Across graded exercises</div>
        </article>
        <article className="summary-card">
          <span className="summary-card__icon" aria-hidden="true">◷</span>
          <div className="summary-card__label">Required work completed</div>
          <div className="summary-card__value">
            {classMetrics.completionPercent}%
          </div>
          <div className="summary-card__note">Optional exercises excluded</div>
        </article>
      </section>

      <section className="leaderboard" aria-labelledby="leaderboard-title">
        <div className="leaderboard__heading">
          <div>
            <h2 id="leaderboard-title">Student leaderboard</h2>
            <p>Ranked by average grade · select a student for exercise details</p>
          </div>
          <div className="leaderboard__tools">
            <input
              className="search-field"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search students..."
              aria-label="Search by student name or ID"
            />
          </div>
        </div>

        <div className="table-scroll">
          <table className="student-table">
            <thead>
              <tr>
                <th scope="col">Rank</th>
                <SortHeading label="Student" sortKey="name" state={sort} onSort={onSort} />
                <th scope="col">Progress</th>
                <SortHeading label="Assignments" sortKey="assignment" state={sort} onSort={onSort} />
                <SortHeading label="Problems" sortKey="problems" state={sort} onSort={onSort} />
                <SortHeading label="Optional" sortKey="optional" state={sort} onSort={onSort} />
                <SortHeading label="Master" sortKey="master_grade" state={sort} onSort={onSort} />
                <SortHeading label="Avg. grade" sortKey="grade" state={sort} onSort={onSort} />
                <th scope="col">Eligibility</th>
                <th scope="col"><span className="visually-hidden">Details</span></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, index) => {
                const masterExercise = master(student);
                const isEligible = masterExercise
                  ? isGradeSufficient(masterExercise)
                  : false;
                const progress = completion(student.Exercises);
                const assignments = student.Exercises.filter(isAssignment);
                const problems = student.Exercises.filter(isProblem);
                const optional = student.Exercises.filter(isOptional);
                const completedAssignments = assignments.filter(isCompleted).length;
                const completedProblems = problems.filter(isCompleted).length;
                const completedOptional = optional.filter(isCompleted).length;
                const isExpanded = selectedStudentId === student.Id;

                return (
                  <StudentRow
                    key={`${student.Id}-${student.Name}`}
                    student={student}
                    index={index}
                    isExpanded={isExpanded}
                    isEligible={isEligible}
                    progress={progress}
                    masterExercise={masterExercise}
                    assignments={`${completedAssignments}/${assignments.length}`}
                    problems={`${completedProblems}/${problems.length}`}
                    optional={`${completedOptional}/${optional.length}`}
                    onToggle={() =>
                      setSelectedStudentId(isExpanded ? null : student.Id)
                    }
                  />
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={10} className="table-empty">
                    No students match “{query}”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="dashboard-footer">
          <span>
            Assessment eligibility is based on a master assignment grade of
            5.5 or higher.
          </span>
          <span>CSV is processed locally in your browser</span>
        </div>
      </section>
    </>
  );
};

interface StudentRowProps {
  student: Student;
  index: number;
  isExpanded: boolean;
  isEligible: boolean;
  progress: ReturnType<typeof completion>;
  masterExercise: Exercise | undefined;
  assignments: string;
  problems: string;
  optional: string;
  onToggle: () => void;
}

const StudentRow: FC<StudentRowProps> = ({
  student,
  index,
  isExpanded,
  isEligible,
  progress,
  masterExercise,
  assignments,
  problems,
  optional,
  onToggle,
}) => (
  <>
    <tr className={`student-row${isExpanded ? " student-row--expanded" : ""}`}>
      <td>
        <span className={`rank-badge${index < 3 ? ` rank-badge--${index + 1}` : ""}`}>
          {index + 1}
        </span>
      </td>
      <td>
        <div className="student-name">
          <span className="student-name__avatar" aria-hidden="true">
            {initials(student.Name)}
          </span>
          <span className="student-name__text">
            <span className="student-name__primary">{student.Name || "Unnamed student"}</span>
            <span className="student-name__secondary">ID {student.Id}</span>
          </span>
        </div>
      </td>
      <td>
        <div className="progress-cell">
          <div className="progress-cell__meta">
            <span>{progress.completed} of {progress.total} required</span>
            <strong>{progress.percent}%</strong>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label={`${student.Name} required work completed`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percent}
          >
            <div className="progress-track__fill" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      </td>
      <td className="count-cell">{assignments}</td>
      <td className="count-cell">{problems}</td>
      <td className="count-cell">{optional}</td>
      <td>
        {masterExercise?.Score.kind === "right" ? (
          <span className={`status-pill${isGradeSufficient(masterExercise) ? " status-pill--eligible" : " status-pill--not-eligible"}`}>
            {displayGrade(masterExercise.Score.v)}
          </span>
        ) : (
          <span className="status-pill">—</span>
        )}
      </td>
      <td className="grade-cell">{displayGrade(grade(student))}</td>
      <td>
        <span className={`status-pill${isEligible ? " status-pill--eligible" : " status-pill--not-eligible"}`}>
          {isEligible ? "Eligible" : "Not yet"}
        </span>
      </td>
      <td>
        <button
          className="details-toggle"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? "Hide" : "View"} ${student.Name} exercise details`}
        >
          {isExpanded ? "Hide" : "Details"} {isExpanded ? "↑" : "↓"}
        </button>
      </td>
    </tr>
    {isExpanded && (
      <tr className="details-row">
        <td colSpan={10}>
          <div className="student-details">
            <div className="student-details__heading">
              <span>Exercise breakdown</span>
              <span className="student-details__hint">
                {student.Exercises.length} exercises in gradebook
              </span>
            </div>
            <ul className="student-details__list">
              {student.Exercises.map((exercise, exerciseIndex) => {
                const score =
                  exercise.Score.kind === "right" ? exercise.Score.v : null;
                const className =
                  score === null
                    ? "student-details__exercise student-details__exercise--missing"
                    : score < 5.5
                      ? "student-details__exercise student-details__exercise--below"
                      : "student-details__exercise";

                return (
                  <li className={className} key={`${exercise.Title}-${exerciseIndex}`}>
                    <strong>{exercise.Title || "Untitled exercise"}</strong>
                    <span>{score === null ? "Not graded" : displayGrade(score)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </td>
      </tr>
    )}
  </>
);
