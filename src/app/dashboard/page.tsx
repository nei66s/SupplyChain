import DashboardClient from './client-dashboard';
import { getDashboardSnapshot } from '@/lib/repository/dashboard';
import { getPeopleIndicators, PeopleIndicatorsData } from '@/lib/repository/people-indicators';

export default async function DashboardPage() {
  let peopleData: PeopleIndicatorsData | null = null;
  try {
    peopleData = await getPeopleIndicators('30d');
  } catch (e) {
    console.error('[dashboard] Failed to load people indicators', e);
  }
  const dashboardData = await getDashboardSnapshot();
  return <DashboardClient data={dashboardData} peopleData={peopleData} />;
}
