import jwt from 'jsonwebtoken';
import { db, dbOptions, Firebird } from '../config/knex.config';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_hotel_key_123';

export class AuthService {
    static async loginWithFirebird(username: string, password: string): Promise<{ token: string; user: { username: string; nombre: string; cargo: string } }> {
        return new Promise((resolve, reject) => {
            const cleanUsername = username.trim();
            const authOptions = {
                ...dbOptions,
                user: cleanUsername,
                password: password
            };

            Firebird.attach(authOptions, async (err: any, fb: any) => {
                if (err) {
                    console.error(`❌ Fallo de autenticación en Firebird (${cleanUsername}):`, err.message);
                    return reject(new Error('Credenciales inválidas o no se pudo abrir la base de datos Firebird'));
                }

                console.log(`✅ Usuario "${cleanUsername}" autenticado exitosamente en Firebird`);
                fb.detach();

                let displayName = '';
                let cargo = '';

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
                } catch (dbErr: any) {
                    console.warn('Aviso consultando datos de USUARIO en login:', dbErr?.message);
                }

                if (!displayName) {
                    if (cleanUsername.toUpperCase() === 'SYSDBA') {
                        displayName = 'Administrador';
                    } else {
                        displayName = cleanUsername;
                    }
                }

                if (!cargo) {
                    cargo = (cleanUsername.toUpperCase() === 'SYSDBA') ? 'Administrador' : 'Recepción';
                }

                const userData = {
                    username: cleanUsername,
                    nombre: displayName,
                    cargo: cargo
                };

                const token = jwt.sign(
                    userData,
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                resolve({
                    token,
                    user: userData
                });
            });
        });
    }
}
