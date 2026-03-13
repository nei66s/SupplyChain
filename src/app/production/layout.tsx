import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { RealtimeListener } from "@/components/RealtimeListener";
import { getCurrentUser } from '@/lib/auth';

export default async function ProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <>
      <RealtimeListener />
      <AppShell user={user}>{children}</AppShell>
    </>
  );
}
