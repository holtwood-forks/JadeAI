import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { SettingsDialog } from '@/components/settings/settings-dialog';
import { resolveRecruitEnabled } from '@/lib/features';

export default async function RecruitLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  if (!resolveRecruitEnabled(process.env)) {
    const { locale } = await params;
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-background">
      <Header />
      {/* 宽度交给下面各自的容器：列表页要和 Header 一样是 max-w-7xl px-4，
          工作区要用满宽屏。在这里先套一层 px-4 的话，列表页再 mx-auto 居中
          就会比 Header 的 logo 左移 16px，两者对不齐。 */}
      <main>{children}</main>
      <SettingsDialog />
    </div>
  );
}
