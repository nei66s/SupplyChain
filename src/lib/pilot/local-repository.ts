import { PilotRepository, PILOT_STORAGE_KEY } from './contracts';
import { buildSeedData } from './seed';
import { PilotDb } from './types';

function isBrowser() {
  return typeof window !== 'undefined';
}

export class LocalPilotRepository implements PilotRepository {
  load(): PilotDb {
    if (!isBrowser()) {
      return buildSeedData();
    }

    const raw = window.localStorage.getItem(PILOT_STORAGE_KEY);
    if (!raw) {
      const seeded = buildSeedData();
      this.save(seeded);
      return seeded;
    }

    try {
      return JSON.parse(raw) as PilotDb;
    } catch {
      const seeded = buildSeedData();
      this.save(seeded);
      return seeded;
    }
  }

  save(state: PilotDb): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(PILOT_STORAGE_KEY, JSON.stringify(state));
  }

  reset(): PilotDb {
    const seeded = buildSeedData();
    this.save(seeded);
    return seeded;
  }
}
