import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';

export default async function MaterialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sc-session')?.value;

  if (!token) {
    redirect('/login');
  }

  return <AppShell>{children}</AppShell>;
}
