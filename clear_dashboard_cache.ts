import { invalidateDashboardCache, refreshDashboardSnapshot } from './src/lib/repository/dashboard';
async function run() {
    try {
        console.log('Invalidating Redis cache...');
        await invalidateDashboardCache();
        console.log('Refreshing Materialized Views and Next.js cache...');
        await refreshDashboardSnapshot(true);
        console.log('CACHE CLEARING DONE');
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
