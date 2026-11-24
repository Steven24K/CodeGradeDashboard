import { CourseDashboard } from "@/spa/components/CourseDashboard";

interface PageProps {
  params: Promise<{ courseId: string; courseSlug: string }>;
}

export default async function CoursePage({ params }: PageProps) {
  const { courseId, courseSlug } = await params;
  return <CourseDashboard courseId={courseId} courseSlug={courseSlug} />;
}
