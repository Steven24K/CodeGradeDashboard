import {
  CodeGradeAssignment,
  CodeGradeGradebook,
  Exercise,
  Student,
} from "./Model";

export interface CodeGradeCourse {
  id: string;
  name: string;
}

export interface CodeGradeSubmission {
  id: string;
  createdAt: string;
  grade: number | null;
  deadline: string | null;
  lockDate: string | null;
}

export interface AssignmentSubmissions {
  assignment: CodeGradeCourse;
  submissions: CodeGradeSubmission[];
}

export class CodeGradeApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "CodeGradeApiError";
  }
}

const requestLocalApi = async (
  path: string,
  signal: AbortSignal,
  options: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {},
): Promise<unknown> => {
  let response: Response;

  try {
    response = await fetch(path, {
      headers: {
        Accept: "application/json",
        ...(options.body === undefined
          ? {}
          : { "Content-Type": "application/json" }),
      },
      method: options.method ?? "GET",
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
      credentials: "same-origin",
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new CodeGradeApiError(
      "Could not reach the local CodeGrade service. Make sure the Next.js server is running.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CodeGradeApiError(
      "The local CodeGrade service returned invalid JSON.",
      response.status,
    );
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : `The local CodeGrade service returned HTTP ${response.status}.`;
    throw new CodeGradeApiError(message, response.status);
  }

  return payload;
};

export const isCourse = (value: unknown): value is CodeGradeCourse =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "name" in value &&
  typeof value.name === "string";

export const isStudent = (value: unknown): value is Student =>
  typeof value === "object" &&
  value !== null &&
  "Id" in value &&
  typeof value.Id === "string" &&
  "Name" in value &&
  typeof value.Name === "string" &&
  "Exercises" in value &&
  Array.isArray(value.Exercises) &&
  value.Exercises.every(isExercise);

const isExercise = (value: unknown): value is Exercise => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("Title" in value) ||
    typeof value.Title !== "string" ||
    !("Score" in value) ||
    typeof value.Score !== "object" ||
    value.Score === null ||
    !("kind" in value.Score)
  ) {
    return false;
  }

  return (
    (value.Score.kind === "right" &&
      "v" in value.Score &&
      typeof value.Score.v === "number") ||
    (value.Score.kind === "left" &&
      "v" in value.Score &&
      typeof value.Score.v === "string")
  );
};

export const fetchCourses = async (
  signal: AbortSignal,
): Promise<CodeGradeCourse[]> => {
  const payload = await requestLocalApi(
    "/api/codegrade/courses",
    signal,
  );
  if (!Array.isArray(payload) || !payload.every(isCourse)) {
    throw new CodeGradeApiError(
      "The local CodeGrade service returned an invalid courses list.",
    );
  }
  return payload;
};

export const isAssignment = (value: unknown): value is CodeGradeAssignment =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "name" in value &&
  typeof value.name === "string";

export const connectCodeGrade = async (
  token: string,
  signal: AbortSignal,
): Promise<CodeGradeCourse[]> => {
  const payload = await requestLocalApi(
    "/api/codegrade/session",
    signal,
    { method: "POST", body: { token } },
  );
  if (!Array.isArray(payload) || !payload.every(isCourse)) {
    throw new CodeGradeApiError(
      "The local CodeGrade service returned an invalid courses list.",
    );
  }
  return payload;
};

export const disconnectCodeGrade = async (
  signal: AbortSignal,
): Promise<void> => {
  await requestLocalApi("/api/codegrade/session", signal, {
    method: "DELETE",
  });
};

export const fetchCourseGradebook = async (
  courseId: string,
  signal: AbortSignal,
): Promise<CodeGradeGradebook> => {
  const payload = await requestLocalApi(
    `/api/codegrade/courses/${encodeURIComponent(courseId)}/gradebook`,
    signal,
  );
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("assignments" in payload) ||
    !Array.isArray(payload.assignments) ||
    !payload.assignments.every(isAssignment) ||
    !("students" in payload) ||
    !Array.isArray(payload.students) ||
    !payload.students.every(isStudent)
  ) {
    throw new CodeGradeApiError(
      "The local CodeGrade service returned an invalid gradebook.",
    );
  }
  return {
    assignments: payload.assignments,
    students: payload.students,
  };
};

export const fetchStudentSubmissions = async (
  courseId: string,
  studentId: string,
  assignments: CodeGradeAssignment[],
  signal: AbortSignal,
): Promise<AssignmentSubmissions[]> => {
  const payload = await requestLocalApi(
    `/api/codegrade/courses/${encodeURIComponent(courseId)}/students/${encodeURIComponent(studentId)}/submissions`,
    signal,
    { method: "POST", body: { assignments } },
  );
  if (!Array.isArray(payload) || !payload.every(isAssignmentSubmissions)) {
    throw new CodeGradeApiError(
      "The local CodeGrade service returned invalid submission data.",
    );
  }
  return payload;
};

export const isAssignmentSubmissions = (
  value: unknown,
): value is AssignmentSubmissions =>
  typeof value === "object" &&
  value !== null &&
  "assignment" in value &&
  isCourse(value.assignment) &&
  "submissions" in value &&
  Array.isArray(value.submissions) &&
  value.submissions.every(isSubmission);

export const isSubmission = (value: unknown): value is CodeGradeSubmission =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "createdAt" in value &&
  typeof value.createdAt === "string" &&
  "grade" in value &&
  (typeof value.grade === "number" || value.grade === null) &&
  "deadline" in value &&
  (typeof value.deadline === "string" || value.deadline === null) &&
  "lockDate" in value &&
  (typeof value.lockDate === "string" || value.lockDate === null);
