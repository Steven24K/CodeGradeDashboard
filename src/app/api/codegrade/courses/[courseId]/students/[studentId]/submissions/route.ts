import {
  getBearerToken,
  getStudentSubmissions,
  jsonError,
} from "../../../../../_lib";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; studentId: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { courseId, studentId } = await context.params;
    if (!courseId || !studentId) {
      return Response.json(
        { message: "Course ID and CodeGrade student ID are required." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { message: "An assignment list is required." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const assignments =
      typeof body === "object" &&
      body !== null &&
      "assignments" in body
        ? body.assignments
        : null;
    const token = await getBearerToken();
    const submissions = await getStudentSubmissions(
      request,
      token,
      studentId,
      assignments,
    );
    return Response.json(submissions, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (reason) {
    return jsonError(reason);
  }
}
