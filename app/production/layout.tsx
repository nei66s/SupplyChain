import { AppShell } from '@/components/app-shell';

export default function ProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
