export const Tables = {
  AUTH_USERS: 'auth_users',
  AUTH_REFRESH_TOKENS: 'auth_refresh_tokens',
  COLONY_SPECIES: 'colony_species',
  COLONY_COLONIES: 'colony_colonies',
  COLONY_MEMBERS: 'colony_members',
  LOG_ENTRIES: 'log_entries',
  LOG_ENVIRONMENTAL_READINGS: 'log_environmental_readings',
  MEDIA_FILES: 'media_files',
} as const;

export type TableName = (typeof Tables)[keyof typeof Tables];
