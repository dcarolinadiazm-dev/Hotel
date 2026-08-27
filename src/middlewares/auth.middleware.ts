import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_hotel_key_123';

export interface AuthenticatedRequest extends Request {
    user?: any;
}

export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

    if (!token) {
        return res.status(403).json({ error: 'No se proporcionó token de sesión' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
        if (err) {
            return res.status(401).json({ error: 'Sesión expirada o token inválido' });
        }
        req.user = decoded;
        next();
    });
};
