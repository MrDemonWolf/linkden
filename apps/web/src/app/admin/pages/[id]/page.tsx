import EditPageClient from "./client";

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

export default function EditPagePage() {
  return <EditPageClient />;
}
