import { AppShell } from '@/components/app-shell';
import { RealtimeListener } from "@/components/RealtimeListener";

export default function OrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RealtimeListener />
      <AppShell>{children}</AppShell>
    </>
  );
}
