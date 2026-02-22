import EditLinkClient from "./client";

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

export default function EditLinkPage() {
  return <EditLinkClient />;
}
