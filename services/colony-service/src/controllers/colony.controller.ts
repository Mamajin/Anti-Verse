import { Request, Response, NextFunction } from 'express';
import { SpeciesModel } from '../models/species.model';
import { ColonyModel } from '../models/colony.model';
import { MemberModel } from '../models/member.model';
import { AppError } from '../utils/AppError';
import type { CreateColonyRequest, UpdateColonyRequest, AddMemberRequest } from '@antiverse/types';

export class ColonyController {
  
  static async listSpecies(req: Request, res: Response, next: NextFunction) {
    try {
      const species = await SpeciesModel.findAll();
      res.json({ data: species.map(SpeciesModel.toDomain) });
    } catch (err) {
      next(err);
    }
  }

  static async listColonies(req: Request, res: Response, next: NextFunction) {
    try {
      const colonies = await ColonyModel.findAll();
      res.json({ data: colonies });
    } catch (err) {
      next(err);
    }
  }

  static async getColony(req: Request, res: Response, next: NextFunction) {
    try {
      const colony = await ColonyModel.findById(req.params.id);
      if (!colony) throw AppError.notFound('Colony not found');
      
      const speciesRow = await SpeciesModel.findById(colony.species_id);

      // Construct domain object
      const domainColony = {
        ...colony,
        species: speciesRow ? SpeciesModel.toSummary(speciesRow) : null,
        accessRole: req.accessRole,
      };

      res.json({ data: domainColony });
    } catch (err) {
      next(err);
    }
  }

  static async createColony(req: Request<{}, {}, CreateColonyRequest>, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const species = await SpeciesModel.findById(data.speciesId);
      if (!species) throw AppError.badRequest('Invalid species ID');

      const colony = await ColonyModel.create({
        owner_id: req.user!.userId,
        name: data.name,
        description: data.description || null,
        species_id: data.speciesId,
        queen_count: data.queenCount,
        estimated_worker_count: data.estimatedWorkerCount || null,
        founding_date: data.foundingDate ? new Date(data.foundingDate) : null,
      });

      res.status(201).json({ data: colony });
    } catch (err) {
      next(err);
    }
  }

  static async updateColony(req: Request<{ id: string }, {}, UpdateColonyRequest>, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body;

      const updates: any = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.description !== undefined) updates.description = data.description;
      if (data.status !== undefined) updates.status = data.status;
      if (data.queenCount !== undefined) updates.queen_count = data.queenCount;
      if (data.estimatedWorkerCount !== undefined) updates.estimated_worker_count = data.estimatedWorkerCount;

      const colony = await ColonyModel.update(id, updates);
      if (!colony) throw AppError.notFound();

      res.json({ data: colony });
    } catch (err) {
      next(err);
    }
  }

  static async addMember(req: Request<{ id: string }, {}, AddMemberRequest>, res: Response, next: NextFunction) {
    try {
      const colonyId = req.params.id;
      const userId = req.body.userId;
      const accessRole = req.body.accessRole;

      // Notice: In the actual requirement, you might want to call authClient.get(`/api/auth/users/${userId}`)
      // to resolve the real display_name and email instead of placeholders.
      await MemberModel.addMember({
        colony_id: colonyId,
        user_id: userId,
        user_display_name: 'Invited User', // Normally fetched via auth service
        user_email: 'unknown@example.com', // Normally fetched via auth service
        access_role: accessRole as any,
        granted_at: new Date()
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  static async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const members = await MemberModel.getMembers(req.params.id);
      res.json({ data: members });
    } catch (err) {
      next(err);
    }
  }
}
