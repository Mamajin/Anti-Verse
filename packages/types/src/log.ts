export enum LogEntryType { Observation = 'observation', Feeding = 'feeding', Maintenance = 'maintenance', Environmental = 'environmental' }
export interface EnvironmentalReading { temperature: number | null; humidity: number | null; lightLevel: number | null; }
export interface EnvironmentalDataPoint extends EnvironmentalReading { recordedAt: string; }
export interface LogEntry { id: string; colonyId: string; userId: string; userDisplayName: string; entryType: LogEntryType; title: string; content: string; occurredAt: string; environmentalReading: EnvironmentalReading | null; createdAt: string; updatedAt: string; }
export interface CreateLogEntryRequest { entryType: LogEntryType; title: string; content: string; occurredAt?: string; environmentalReading?: Partial<EnvironmentalReading>; }
export interface UpdateLogEntryRequest { entryType?: LogEntryType; title?: string; content?: string; occurredAt?: string; environmentalReading?: Partial<EnvironmentalReading>; }
export interface VerifyLogEntryResult { entryId: string; colonyId: string; }
