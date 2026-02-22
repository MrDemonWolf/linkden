import ContactDetailClient from "./client";

export async function generateStaticParams(): Promise<{ id: string }[]> {
  return [];
}

export default function ContactDetailPage() {
  return <ContactDetailClient />;
}
