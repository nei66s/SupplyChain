import { AppShell } from '@/components/app-shell';

export default function MaterialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
