import { AppShell } from '@/components/app-shell';
import { RealtimeListener } from "@/components/RealtimeListener";

export default function InventoryLayout({
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
