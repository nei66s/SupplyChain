import { PilotDb } from './types';

export interface PilotRepository {
  load(): PilotDb;
  save(state: PilotDb): void;
  reset(): PilotDb;
}

export const PILOT_STORAGE_KEY = 'inventario-agil-pilot-db-v1';
