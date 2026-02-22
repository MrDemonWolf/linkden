import PageClient from "./client";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

export default function CustomPage() {
  return <PageClient />;
}
