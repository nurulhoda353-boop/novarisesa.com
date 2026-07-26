import Dashboard from "@/components/Dashboard";

export default async function Workspace({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  return <Dashboard route={slug} />;
}
