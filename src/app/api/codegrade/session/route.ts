import { cookies } from "next/headers";
import {
  CODEGRADE_TOKEN_COOKIE,
  CodeGradeServerError,
  getCourses,
  jsonError,
} from "../_lib";

export const dynamic = "force-dynamic";

const SESSION_MAX_AGE = 60 * 60 * 8;

export async function POST(request: Request): Promise<Response> {
  try {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      throw new CodeGradeServerError("A bearer token is required.", 400);
    }

    if (
      typeof payload !== "object" ||
      payload === null ||
      !("token" in payload) ||
      typeof payload.token !== "string" ||
      !payload.token.trim()
    ) {
      throw new CodeGradeServerError("A bearer token is required.", 400);
    }

    const token = payload.token.trim().replace(/^Bearer\s+/i, "");
    const courses = await getCourses(request, token);
    const cookieStore = await cookies();
    cookieStore.set(CODEGRADE_TOKEN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/codegrade",
      maxAge: SESSION_MAX_AGE,
    });

    return Response.json(courses, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (reason) {
    return jsonError(reason);
  }
}

export async function DELETE(): Promise<Response> {
  const cookieStore = await cookies();
  cookieStore.set(CODEGRADE_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/codegrade",
    maxAge: 0,
  });
  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
