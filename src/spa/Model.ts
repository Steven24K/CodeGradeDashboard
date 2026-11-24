import { Either, Left, Right } from "@/utils/Either";
import { All, Any } from "@/utils/Logic";

export interface Exercise {
  Title: string;
  Score: Either<string, number>;
}

export interface Student {
  Id: string;
  Name: string;
  Exercises: Exercise[];
  CodeGradeId?: string;
}

export interface CodeGradeAssignment {
  id: string;
  name: string;
}

export interface CodeGradeGradebook {
  assignments: CodeGradeAssignment[];
  students: Student[];
}

export type TimeGrouping = "hour" | "day" | "week" | "month";

export type SortBy =
  | "name"
  | "completedAssignments"
  | "completedChallenges"
  | "completedProblems"
  | "completedOptional"
  | "masterGrade"
  | "averageGrade"
  | "cumulativeGrade"
  | "completion"
  | "eligibility";
export type SortDirection = "ASC" | "DESC";
export type EligibilityFilter = "all" | "eligible" | "not-eligible";
export type ExerciseFilter = "all" | "done" | "todo";

export interface StudentFilters {
  eligibility: EligibilityFilter;
  exerciseTitle: string;
  exerciseStatus: ExerciseFilter;
  minAverageGrade: number | null;
  maxAverageGrade: number | null;
  minCompletedAssignments: number | null;
  maxCompletedAssignments: number | null;
  minCompletedProblems: number | null;
  maxCompletedProblems: number | null;
  minCompletion: number | null;
  maxCompletion: number | null;
}

export interface AppState {
  students: Student[] | null;
  error: string;
  studentSearch: string;
  filtersOpen: boolean;
  filters: StudentFilters;
  sortBy: SortBy;
  sortDirection: SortDirection;
  selectedStudentId: string | null;
  exerciseSearch: string;
  completedExercisesOnly: boolean;
}

export const initialFilters = (): StudentFilters => ({
  eligibility: "all",
  exerciseTitle: "",
  exerciseStatus: "all",
  minAverageGrade: null,
  maxAverageGrade: null,
  minCompletedAssignments: null,
  maxCompletedAssignments: null,
  minCompletedProblems: null,
  maxCompletedProblems: null,
  minCompletion: null,
  maxCompletion: null,
});

export const initialAppState = (): AppState => ({
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
});

export const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: "name", label: "Student name" },
  { key: "averageGrade", label: "Average grade" },
  { key: "cumulativeGrade", label: "Cumulative grade" },
  { key: "masterGrade", label: "Master assignment grade" },
  { key: "completedAssignments", label: "Assignments completed" },
  { key: "completedChallenges", label: "Challenges completed" },
  { key: "completedProblems", label: "Problems completed" },
  { key: "completedOptional", label: "Optional tasks completed" },
  { key: "completion", label: "Required work completion" },
  { key: "eligibility", label: "Assessment eligibility" },
];

export const isProblem = (exercise: Exercise): boolean =>
  /^A\dW\d+P\d+/.test(exercise.Title);
export const isAssignment = (exercise: Exercise): boolean =>
  /^A\dW\d+A\d+/.test(exercise.Title);
export const isOptional = (exercise: Exercise): boolean =>
  /^A\dW\d+O\d+/.test(exercise.Title);
export const isMaster = (exercise: Exercise): boolean =>
  /^A\dW\d+M\d+/.test(exercise.Title);
export const isChallenge = (exercise: Exercise): boolean =>
  /^A\dW\d+C(?:\s|$)/.test(exercise.Title);
export const isAssignmentTask = (exercise: Exercise): boolean =>
  Boolean(Any(isAssignment, isMaster, isChallenge)(exercise));
export const isProblemTask = (exercise: Exercise): boolean =>
  !isAssignmentTask(exercise);
export const isCompleted = (exercise: Exercise): boolean =>
  exercise.Score.kind === "right";
export const isTodo = (exercise: Exercise): boolean => !isCompleted(exercise);
export const scoreOf = (exercise: Exercise): number =>
  exercise.Score.kind === "right" ? exercise.Score.v : 0;
export const isGradeSufficient = (exercise: Exercise): boolean =>
  Boolean(All(isCompleted, (item) => scoreOf(item) >= 5.5)(exercise));

export const hasMasterAssignment = (student: Student): boolean =>
  student.Exercises.some(isMaster);
export const hasPassingAssignments = (student: Student): boolean =>
  student.Exercises.filter(isAssignment).every(isGradeSufficient);
export const hasPassingMasterAssignment = (student: Student): boolean =>
  student.Exercises.some(All(isMaster, isGradeSufficient));
export const hasCompletedChallenges = (student: Student): boolean =>
  student.Exercises.filter(isChallenge).every(isCompleted);
export const isEligible = (student: Student): boolean =>
  Boolean(
    All(
      hasMasterAssignment,
      hasPassingAssignments,
      hasPassingMasterAssignment,
      hasCompletedChallenges,
    )(student),
  );

export const average = (scores: number[]): number =>
  scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
export const averageGrade = (student: Student): number =>
  average(student.Exercises.filter(isCompleted).map(scoreOf));
export const cumulativeGrade = (student: Student): number =>
  average(student.Exercises.map(scoreOf));

export interface StudentMetrics {
  completedAssignments: number;
  totalAssignments: number;
  completedChallenges: number;
  totalChallenges: number;
  completedProblems: number;
  totalProblems: number;
  completedOptional: number;
  totalOptional: number;
  completion: number;
  completedRequired: number;
  totalRequired: number;
  averageGrade: number;
  cumulativeGrade: number;
  masterGrade: number;
  eligible: boolean;
}

export const getStudentMetrics = (student: Student): StudentMetrics => {
  const assignments = student.Exercises.filter(isAssignment);
  const challenges = student.Exercises.filter(isChallenge);
  const problems = student.Exercises.filter(isProblem);
  const optional = student.Exercises.filter(isOptional);
  const required = student.Exercises.filter((exercise) => !isOptional(exercise));
  const completedRequired = required.filter(isCompleted).length;
  const master = student.Exercises.find(isMaster);

  return {
    completedAssignments: assignments.filter(isCompleted).length,
    totalAssignments: assignments.length,
    completedChallenges: challenges.filter(isCompleted).length,
    totalChallenges: challenges.length,
    completedProblems: problems.filter(isCompleted).length,
    totalProblems: problems.length,
    completedOptional: optional.filter(isCompleted).length,
    totalOptional: optional.length,
    completion: required.length
      ? Math.round((completedRequired / required.length) * 100)
      : 0,
    completedRequired,
    totalRequired: required.length,
    averageGrade: averageGrade(student),
    cumulativeGrade: cumulativeGrade(student),
    masterGrade: master ? scoreOf(master) : -1,
    eligible: isEligible(student),
  };
};

const sortValues: Record<SortBy, (student: Student) => number | string> = {
  name: (student) => student.Name.toLocaleLowerCase(),
  completedAssignments: (student) => getStudentMetrics(student).completedAssignments,
  completedChallenges: (student) => getStudentMetrics(student).completedChallenges,
  completedProblems: (student) => getStudentMetrics(student).completedProblems,
  completedOptional: (student) => getStudentMetrics(student).completedOptional,
  masterGrade: (student) => getStudentMetrics(student).masterGrade,
  averageGrade,
  cumulativeGrade,
  completion: (student) => getStudentMetrics(student).completion,
  eligibility: (student) => Number(getStudentMetrics(student).eligible),
};

export const sortValue = (student: Student, key: SortBy): number | string =>
  sortValues[key](student);

export const matchesStudentFilters = (
  student: Student,
  search: string,
  filters: StudentFilters,
): boolean => {
  const metrics = getStudentMetrics(student);
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const searchMatches = (item: Student) =>
    normalizedSearch.length === 0 ||
    item.Name.toLocaleLowerCase().includes(normalizedSearch) ||
    item.Id.toLocaleLowerCase().includes(normalizedSearch);
  const eligibilityMatches = (item: Student) =>
    filters.eligibility === "all" ||
    (filters.eligibility === "eligible" ? isEligible(item) : !isEligible(item));
  const exerciseMatches = (item: Student) =>
    filters.exerciseTitle === "" ||
    filters.exerciseStatus === "all" ||
    item.Exercises.some(
      All(
        (exercise) => exercise.Title === filters.exerciseTitle,
        filters.exerciseStatus === "done" ? isCompleted : isTodo,
      ),
    );
  const averageGradeMatches = () =>
    (filters.minAverageGrade === null ||
      metrics.averageGrade >= filters.minAverageGrade) &&
    (filters.maxAverageGrade === null ||
      metrics.averageGrade <= filters.maxAverageGrade);
  const assignmentsMatch = () =>
    (filters.minCompletedAssignments === null ||
      metrics.completedAssignments >= filters.minCompletedAssignments) &&
    (filters.maxCompletedAssignments === null ||
      metrics.completedAssignments <= filters.maxCompletedAssignments);
  const problemsMatch = () =>
    (filters.minCompletedProblems === null ||
      metrics.completedProblems >= filters.minCompletedProblems) &&
    (filters.maxCompletedProblems === null ||
      metrics.completedProblems <= filters.maxCompletedProblems);
  const completionMatches = () =>
    (filters.minCompletion === null ||
      metrics.completion >= filters.minCompletion) &&
    (filters.maxCompletion === null ||
      metrics.completion <= filters.maxCompletion);

  return Boolean(
    All(
      searchMatches,
      eligibilityMatches,
      exerciseMatches,
      averageGradeMatches,
      assignmentsMatch,
      problemsMatch,
      completionMatches,
    )(student),
  );
};

export const parseCsvRows = (input: string): string[][] => {
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

export const parseStudents = (input: string): Student[] => {
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
