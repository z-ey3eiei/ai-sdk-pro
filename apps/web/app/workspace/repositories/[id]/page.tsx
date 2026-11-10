import RepositoryViewer from "../../../../components/RepositoryViewer";

export default async function RepositoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RepositoryViewer repositoryId={id} />;
}
