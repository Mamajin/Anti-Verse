import { Request, Response, NextFunction } from 'express';
import { LogModel } from '../models/log.model';
import { AppError } from '../utils/AppError';
import type { CreateLogEntryRequest, LogEntry, EnvironmentalReading } from '@antiverse/types';

export class LogController {
  
  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const colonyId = req.params.colonyId;
      const rows = await LogModel.findByColonyId(colonyId);
      
      const data: LogEntry[] = rows.map(row => ({
        id: row.id,
        colonyId: row.colony_id,
        userId: row.user_id,
        userDisplayName: row.user_display_name,
        entryType: row.entry_type as LogEntry['entryType'],
        title: row.title,
        content: row.content,
        occurredAt: row.occurred_at.toISOString(),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        environmentalReading: (row.temperature != null || row.humidity != null || row.light_level != null) ? {
          temperature: row.temperature,
          humidity: row.humidity,
          lightLevel: row.light_level
        } as EnvironmentalReading : null,
      }));

      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  static async createLog(req: Request<{ colonyId: string }, {}, CreateLogEntryRequest>, res: Response, next: NextFunction) {
    try {
      const colonyId = req.params.colonyId;
      const data = req.body;
      const context = req.colonyContext!;

      // Note: Ideally, the user name comes securely from the JWT via authGuard in this service,
      // but verifyColony only returns userId. Often we'd attach a full authGuard here too.
      // For simplicity in this demo, we'll embed the user ID. We can decode JWT here to get extra info if needed,
      // or rely on a user service sidecar. Let's retrieve display name from a theoretical decoded JWT if we add authGuard,
      // but currently the request is only secured via requireColonyAccess which calls another service.
      
      // Let's assume the client passes the token, and verifyColony verified it. We just have userId.
      const userDisplayName = `User ${context.userId.substring(0, 5)}`; // Stub. Normally we'd decode JWT securely to extract display name.

      const envRow = data.environmentalReading ? {
        temperature: data.environmentalReading.temperature ?? null,
        humidity: data.environmentalReading.humidity ?? null,
        light_level: data.environmentalReading.lightLevel ?? null,
      } : undefined;

      const created = await LogModel.create({
        colony_id: colonyId,
        user_id: context.userId,
        user_display_name: userDisplayName,
        entry_type: data.entryType,
        title: data.title,
        content: data.content,
        occurred_at: data.occurredAt ? new Date(data.occurredAt) : new Date(),
      }, envRow);

      res.status(201).json({ data: created }); // For brevity returning raw row, should be mapped
    } catch (err) {
      next(err);
    }
  }

  static async deleteLog(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const log = await LogModel.findById(id);
      
      if (!log) throw AppError.notFound('Log entry not found');

      // The middleware checked if user can access the colony.
      // Additionally, only the creator of the log, or an admin/owner should delete.
      // But we mapped owner/collaborator to have delete rights for simplicity here.
      await LogModel.delete(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
