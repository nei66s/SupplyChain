import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { RealtimeListener } from "@/components/RealtimeListener";

export default async function ProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sc-session')?.value;

  if (!token) {
    redirect('/login');
  }

  return (
    <>
      <RealtimeListener />
      <AppShell>{children}</AppShell>
    </>
  );
}
