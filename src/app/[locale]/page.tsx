import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing/landing-page';
import { resolveDashboardHome } from '@/lib/home';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (resolveDashboardHome(process.env)) {
    const { locale } = await params;
    redirect(`/${locale}/dashboard`);
  }

  return <LandingPage />;
}
