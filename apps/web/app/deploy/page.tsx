import { redirect } from "next/navigation";

export default async function DeployPage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string }>;
}) {
  const { repo } = await searchParams;
  redirect(repo
    ? "/workspace/deploy?repo=" + encodeURIComponent(repo)
    : "/workspace/deploy");
}
