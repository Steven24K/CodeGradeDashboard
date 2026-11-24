import { Exercise, Student } from "./Model";

export interface CodeGradeCourse {
  id: string;
  name: string;
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
  token: string,
  signal: AbortSignal,
): Promise<unknown> => {
  let response: Response;

  try {
    response = await fetch(path, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
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

const isCourse = (value: unknown): value is CodeGradeCourse =>
  typeof value === "object" &&
  value !== null &&
  "id" in value &&
  typeof value.id === "string" &&
  "name" in value &&
  typeof value.name === "string";

const isStudent = (value: unknown): value is Student =>
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
  token: string,
  signal: AbortSignal,
): Promise<CodeGradeCourse[]> => {
  const payload = await requestLocalApi(
    "/api/codegrade/courses",
    token,
    signal,
  );
  if (!Array.isArray(payload) || !payload.every(isCourse)) {
    throw new CodeGradeApiError(
      "The local CodeGrade service returned an invalid courses list.",
    );
  }
  return payload;
};

export const fetchCourseStudents = async (
  courseId: string,
  token: string,
  signal: AbortSignal,
): Promise<Student[]> => {
  const payload = await requestLocalApi(
    `/api/codegrade/courses/${encodeURIComponent(courseId)}/gradebook`,
    token,
    signal,
  );
  if (!Array.isArray(payload) || !payload.every(isStudent)) {
    throw new CodeGradeApiError(
      "The local CodeGrade service returned an invalid gradebook.",
    );
  }
  return payload;
};
