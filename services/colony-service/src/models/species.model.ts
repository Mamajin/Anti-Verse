import { db } from '../db';
import { Tables } from '@antiverse/database';
import type { Species, SpeciesSummary } from '@antiverse/types';

export interface SpeciesRow {
  id: string;
  scientific_name: string;
  common_name: string;
  subfamily: string;
  description: string | null;
  native_region: string | null;
  created_at: Date;
}

export const SpeciesModel = {
  async findAll(): Promise<SpeciesRow[]> {
    return db<SpeciesRow>(Tables.COLONY_SPECIES).orderBy('scientific_name', 'asc');
  },

  async findById(id: string): Promise<SpeciesRow | undefined> {
    return db<SpeciesRow>(Tables.COLONY_SPECIES).where({ id }).first();
  },

  toDomain(row: SpeciesRow): Species {
    return {
      id: row.id,
      scientificName: row.scientific_name,
      commonName: row.common_name,
      subfamily: row.subfamily,
      description: row.description,
      nativeRegion: row.native_region,
      createdAt: row.created_at.toISOString(),
    };
  },

  toSummary(row: SpeciesRow): SpeciesSummary {
    return {
      id: row.id,
      scientificName: row.scientific_name,
      commonName: row.common_name,
    };
  }
};
