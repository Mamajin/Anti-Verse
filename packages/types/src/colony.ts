export enum ColonyStatus { Active = 'active', Inactive = 'inactive', Deceased = 'deceased' }
export enum AccessRole { Owner = 'owner', Collaborator = 'collaborator', Viewer = 'viewer' }
export interface Species { id: string; scientificName: string; commonName: string; subfamily: string; description: string | null; nativeRegion: string | null; createdAt: string; }
export interface SpeciesSummary { id: string; scientificName: string; commonName: string; }
export interface Colony { id: string; ownerId: string; name: string; description: string | null; species: SpeciesSummary; status: ColonyStatus; foundingDate: string | null; queenCount: number; estimatedWorkerCount: number | null; accessRole: AccessRole; createdAt: string; updatedAt: string; }
export interface ColonyMember { userId: string; displayName: string; email: string; accessRole: AccessRole; grantedAt: string; }
export interface CreateColonyRequest { name: string; speciesId: string; description?: string; foundingDate?: string; queenCount: number; estimatedWorkerCount?: number; }
export interface UpdateColonyRequest { name?: string; description?: string; status?: ColonyStatus; queenCount?: number; estimatedWorkerCount?: number; }
export interface AddMemberRequest { userId: string; accessRole: 'collaborator' | 'viewer'; }
export interface VerifyColonyResult { colonyId: string; userId: string; accessRole: AccessRole; }
