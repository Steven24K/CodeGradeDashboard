import "server-only";

import { Left, Right } from "@/utils/Either";
import type { Exercise, Student } from "@/spa/Model";

const CODEGRADE_API = "https://app.codegra.de/api/v1";
const NEXT_TOKEN_HEADER = "Next-Token";

interface Assignment {
  id: string;
  name: string;
}

interface GradeRecord {
  user: {
    id: string;
    username: string;
    name: string;
  };
  grade: number | null;
}

export class CodeGradeServerError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CodeGradeServerError";
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toId = (value: unknown): string | null => {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

const getCollection = (payload: unknown, label: string): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload) && Array.isArray(payload.results)) {
    return payload.results;
  }
  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data;
  }
  throw new CodeGradeServerError(
    `CodeGrade returned an unexpected ${label} response.`,
    502,
  );
};

const parseNamedResource = (
  value: unknown,
  label: string,
): Assignment => {
  if (!isRecord(value)) {
    throw new CodeGradeServerError(
      `CodeGrade returned an invalid ${label}.`,
      502,
    );
  }
  const id = toId(value.id);
  if (!id || typeof value.name !== "string") {
    throw new CodeGradeServerError(
      `CodeGrade returned an invalid ${label}.`,
      502,
    );
  }
  return { id, name: value.name };
};

const parseGradeRecord = (value: unknown): GradeRecord => {
  if (!isRecord(value) || !isRecord(value.user)) {
    throw new CodeGradeServerError(
      "CodeGrade returned an invalid grade record.",
      502,
    );
  }
  const id = toId(value.user.id);
  if (!id) {
    throw new CodeGradeServerError(
      "CodeGrade returned a grade record without a student ID.",
      502,
    );
  }

  const username =
    typeof value.user.username === "string" ? value.user.username : id;
  const name =
    typeof value.user.name === "string" && value.user.name.length > 0
      ? value.user.name
      : username;
  const gradeValue = isRecord(value.grade) ? value.grade.grade : null;
  const numericGrade =
    typeof gradeValue === "number"
      ? gradeValue
      : typeof gradeValue === "string" && gradeValue.trim() !== ""
        ? Number(gradeValue)
        : null;

  return {
    user: { id, username, name },
    grade:
      numericGrade !== null && Number.isFinite(numericGrade)
        ? numericGrade
        : null,
  };
};

const readUpstreamJson = async (
  response: Response,
  resource: string,
): Promise<unknown> => {
  const text = await response.text();
  let payload: unknown;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    if (!response.ok) {
      throw new CodeGradeServerError(
        `CodeGrade returned HTTP ${response.status} while loading ${resource}.`,
        response.status,
      );
    }
    throw new CodeGradeServerError(
      `CodeGrade returned invalid JSON while loading ${resource}.`,
      502,
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new CodeGradeServerError(
        "CodeGrade rejected this bearer token. Check or replace it, then reload.",
        401,
      );
    }
    const message =
      isRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : `CodeGrade returned HTTP ${response.status} while loading ${resource}.`;
    throw new CodeGradeServerError(message, response.status);
  }

  return payload;
};

const getUpstreamJson = async (
  request: Request,
  token: string,
  path: string,
  resource: string,
  nextToken?: string,
): Promise<{ payload: unknown; nextToken: string | null }> => {
  let response: Response;
  const url = new URL(`${CODEGRADE_API}${path}`);
  if (nextToken) {
    url.searchParams.set("next-token", nextToken);
  }

  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      signal: request.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new CodeGradeServerError(
      `Could not connect to CodeGrade while loading ${resource}.`,
      502,
    );
  }

  return {
    payload: await readUpstreamJson(response, resource),
    nextToken: response.headers.get(NEXT_TOKEN_HEADER)?.trim() || null,
  };
};

export const getBearerToken = (request: Request): string => {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1].trim()) {
    throw new CodeGradeServerError(
      "Enter a CodeGrade bearer token to continue.",
      401,
    );
  }
  return match[1].trim();
};

export const getCourses = async (
  request: Request,
  token: string,
): Promise<Assignment[]> => {
  const { payload } = await getUpstreamJson(
    request,
    token,
    "/courses/",
    "courses",
  );
  return getCollection(payload, "courses").map((course) =>
    parseNamedResource(course, "course"),
  );
};

const getAssignments = async (
  request: Request,
  token: string,
  courseId: string,
): Promise<Assignment[]> => {
  const assignments: Assignment[] = [];
  const assignmentIds = new Set<string>();
  const seenTokens = new Set<string>();
  let nextToken: string | undefined;

  do {
    const { payload, nextToken: responseToken } = await getUpstreamJson(
      request,
      token,
      `/courses/${encodeURIComponent(courseId)}/assignments/`,
      "assignments",
      nextToken,
    );
    for (const rawAssignment of getCollection(payload, "assignments")) {
      const assignment = parseNamedResource(rawAssignment, "assignment");
      if (!assignmentIds.has(assignment.id)) {
        assignments.push(assignment);
        assignmentIds.add(assignment.id);
      }
    }

    nextToken = responseToken ?? undefined;
    if (nextToken && seenTokens.has(nextToken)) {
      throw new CodeGradeServerError(
        "CodeGrade repeated an assignment pagination token; stopped to avoid an endless request loop.",
        502,
      );
    }
    if (nextToken) seenTokens.add(nextToken);
  } while (nextToken);

  return assignments;
};

const getAssignmentGrades = async (
  request: Request,
  token: string,
  assignment: Assignment,
): Promise<GradeRecord[]> => {
  const { payload } = await getUpstreamJson(
    request,
    token,
    `/assignments/${encodeURIComponent(assignment.id)}/grades/`,
    `grades for ${assignment.name}`,
  );
  return getCollection(payload, `grades for ${assignment.name}`).map(
    parseGradeRecord,
  );
};

export const getCourseGradebook = async (
  request: Request,
  token: string,
  courseId: string,
): Promise<Student[]> => {
  const assignments = await getAssignments(request, token, courseId);
  const students = new Map<string, GradeRecord["user"]>();
  const gradesByAssignment = new Map<string, Map<string, number | null>>();

  for (const assignment of assignments) {
    const grades = await getAssignmentGrades(request, token, assignment);
    const assignmentGrades = new Map<string, number | null>();

    for (const record of grades) {
      students.set(record.user.id, record.user);
      assignmentGrades.set(record.user.id, record.grade);
    }
    gradesByAssignment.set(assignment.id, assignmentGrades);
  }

  return [...students.values()].map((student) => {
    const exercises: Exercise[] = assignments.map((assignment) => {
      const score = gradesByAssignment.get(assignment.id)?.get(student.id);
      return {
        Title: assignment.name,
        Score:
          score === undefined || score === null
            ? Left<string, number>("")
            : Right<string, number>(score),
      };
    });
    const internalId = student.id;
    const username = student.username;

    return {
      Id: username,
      CodeGradeId: internalId,
      Name: student.name,
      Exercises: exercises,
    };
  });
};

export const jsonError = (reason: unknown): Response => {
  const error =
    reason instanceof CodeGradeServerError
      ? reason
      : new CodeGradeServerError(
          "The server could not complete the CodeGrade request.",
          500,
        );

  return Response.json(
    { message: error.message },
    {
      status: error.status,
      headers: { "Cache-Control": "no-store" },
    },
  );
};
