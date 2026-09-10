import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { db, dbOptions } from '../config/knex.config';
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
        const user = req.user || {};
        const cleanUsername = String(user.username || '').trim();
        let displayName = user.nombre;
        let cargo = user.cargo;

        if (cleanUsername && (!displayName || displayName === cleanUsername)) {
            try {
                const userRow = await db('USUARIO')
                    .whereRaw('UPPER(TRIM(USER_COD)) = ?', [cleanUsername.toUpperCase()])
                    .first();

                if (userRow) {
                    const parts = [userRow.USER_NOMBRE, userRow.USER_APELLIDO]
                        .filter(Boolean)
                        .map((s: any) => String(s).trim())
                        .filter(s => s.length > 0);

                    if (parts.length > 0) {
                        displayName = parts.join(' ').replace(/\w\S*/g, (w) => (w.charAt(0).toUpperCase() + w.substring(1).toLowerCase()));
                    }
                    if (userRow.USER_CARGO) {
                        cargo = String(userRow.USER_CARGO).trim();
                    } else if (userRow.USER_DEPARTAMENTO) {
                        cargo = String(userRow.USER_DEPARTAMENTO).trim();
                    }
                }
            } catch (e: any) { }

            if (!displayName) {
                displayName = (cleanUsername.toUpperCase() === 'SYSDBA') ? 'Administrador' : cleanUsername;
            }
            if (!cargo) {
                cargo = (cleanUsername.toUpperCase() === 'SYSDBA') ? 'Administrador' : 'Recepción';
            }
        }

        res.json({
            user: {
                ...user,
                nombre: displayName || (cleanUsername.toUpperCase() === 'SYSDBA' ? 'Administrador' : cleanUsername),
                cargo: cargo || (cleanUsername.toUpperCase() === 'SYSDBA' ? 'Administrador' : 'Recepción')
            },
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
