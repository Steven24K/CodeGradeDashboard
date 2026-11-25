import { ClassActivity } from "@/spa/components/ClassActivity";

interface PageProps {
  params: Promise<{ courseId: string; courseSlug: string }>;
}

export default async function ClassActivityPage({ params }: PageProps) {
  const { courseId, courseSlug } = await params;
  return <ClassActivity courseId={courseId} courseSlug={courseSlug} />;
}
