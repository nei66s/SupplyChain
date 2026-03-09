import { AppShell } from '@/components/app-shell';
import { RealtimeListener } from "@/components/RealtimeListener";

export default function ProductionLayout({
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
