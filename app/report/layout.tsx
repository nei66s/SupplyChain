import { AppShell } from '@/components/app-shell';

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
