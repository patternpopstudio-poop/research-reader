import { ResearchLibrary } from "@/components/ResearchLibrary";

type Props = {
  searchParams: Promise<{ view?: string; topic?: string }>;
};

export default async function PapersIndexPage({ searchParams }: Props) {
  const params = await searchParams;
  return <ResearchLibrary view={params.view ?? null} topic={params.topic ?? null} />;
}
