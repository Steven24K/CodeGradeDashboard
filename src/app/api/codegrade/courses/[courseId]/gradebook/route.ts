import {
  getBearerToken,
  getCourseGradebook,
  jsonError,
} from "../../../_lib";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { courseId } = await context.params;
    if (!courseId) {
      return Response.json(
        { message: "A course ID is required." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const token = await getBearerToken();
    const gradebook = await getCourseGradebook(request, token, courseId);
    return Response.json(gradebook, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (reason) {
    return jsonError(reason);
  }
}
