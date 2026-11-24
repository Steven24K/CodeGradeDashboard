import { StudentActivity } from "@/spa/components/StudentActivity";

interface PageProps {
  params: Promise<{
    courseId: string;
    courseSlug: string;
    studentId: string;
  }>;
  searchParams: Promise<{
    name?: string | string[];
    username?: string | string[];
  }>;
}

const firstValue = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

export default async function StudentActivityPage({
  params,
  searchParams,
}: PageProps) {
  const [{ courseId, courseSlug, studentId }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  return (
    <StudentActivity
      courseId={courseId}
      courseSlug={courseSlug}
      studentId={studentId}
      studentName={firstValue(query.name)}
      studentNumber={firstValue(query.username)}
    />
  );
}
