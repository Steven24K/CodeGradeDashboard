import { getBearerToken, getCourses, jsonError } from "../_lib";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    const token = await getBearerToken();
    const courses = await getCourses(request, token);
    return Response.json(courses, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (reason) {
    return jsonError(reason);
  }
}
