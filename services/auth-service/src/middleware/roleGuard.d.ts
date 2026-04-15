import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@antiverse/types';
export declare const roleGuard: (allowedRoles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=roleGuard.d.ts.map