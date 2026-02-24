import { IntegrationsPanel } from "@/components/integrations/integrations-panel";

type IntegrationsPageProps = {
  searchParams: Promise<{
    google?: string;
  }>;
};

export default async function IntegrationsPage({ searchParams }: IntegrationsPageProps) {
  const params = await searchParams;
  const googleStatus = params.google ?? null;

  return <IntegrationsPanel initialGoogleStatus={googleStatus} />;
}
