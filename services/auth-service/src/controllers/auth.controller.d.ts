import { Request, Response, NextFunction } from 'express';
import type { RegisterRequest, LoginRequest, UpdateProfileRequest } from '@antiverse/types';
export declare class AuthController {
    static register(req: Request<{}, {}, RegisterRequest>, res: Response, next: NextFunction): Promise<void>;
    static login(req: Request<{}, {}, LoginRequest>, res: Response, next: NextFunction): Promise<void>;
    static refresh(req: Request, res: Response, next: NextFunction): Promise<void>;
    static logout(req: Request, res: Response, next: NextFunction): Promise<void>;
    static verify(req: Request, res: Response, next: NextFunction): Promise<void>;
    static profile(req: Request, res: Response, next: NextFunction): Promise<void>;
    static updateProfile(req: Request<{}, {}, UpdateProfileRequest>, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=auth.controller.d.ts.map