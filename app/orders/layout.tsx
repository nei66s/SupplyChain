import { AppShell } from '@/components/app-shell';

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
