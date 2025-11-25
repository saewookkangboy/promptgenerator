import { Request, Response, NextFunction } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        tier: string;
    };
}
export declare function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
export declare function requireTier(...allowedTiers: string[]): (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map