import { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@antiverse/types';
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                role: UserRole;
            };
        }
    }
}
export declare const authGuard: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=authGuard.d.ts.map