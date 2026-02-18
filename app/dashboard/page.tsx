import DashboardClient from './client-dashboard';
import { getDashboardSnapshot } from '@/lib/repository/dashboard';

export default async function DashboardPage() {
  const dashboardData = await getDashboardSnapshot();
  return <DashboardClient data={dashboardData} />;
}
