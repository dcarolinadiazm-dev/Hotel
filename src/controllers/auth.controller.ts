import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { dbOptions } from '../config/knex.config';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class AuthController {
    static async login(req: Request, res: Response) {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
        }

        try {
            const authResult = await AuthService.loginWithFirebird(username, password);
            res.json({
                message: 'Login exitoso',
                token: authResult.token,
                user: authResult.user
            });
        } catch (error: any) {
            res.status(401).json({ error: error.message || 'Credenciales inválidas' });
        }
    }

    static async verifySession(req: AuthenticatedRequest, res: Response) {
        res.json({
            user: req.user,
            authenticated: true
        });
    }

    static async getDbStatus(req: Request, res: Response) {
        res.json({
            status: 'online',
            database: {
                host: dbOptions.host,
                port: dbOptions.port,
                path: dbOptions.database
            }
        });
    }
}
