import jwt from 'jsonwebtoken';
import { dbOptions, Firebird } from '../config/knex.config';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_hotel_key_123';

export class AuthService {
    static async loginWithFirebird(username: string, password: string): Promise<{ token: string; user: { username: string } }> {
        return new Promise((resolve, reject) => {
            const authOptions = {
                ...dbOptions,
                user: username.trim(),
                password: password
            };

            Firebird.attach(authOptions, (err: any, fb: any) => {
                if (err) {
                    console.error(`❌ Fallo de autenticación en Firebird (${username}):`, err.message);
                    return reject(new Error('Credenciales inválidas o no se pudo abrir la base de datos Firebird'));
                }

                console.log(`✅ Usuario "${username}" autenticado exitosamente en Firebird`);
                fb.detach();

                const token = jwt.sign(
                    { username: username },
                    JWT_SECRET,
                    { expiresIn: '8h' }
                );

                resolve({
                    token,
                    user: { username }
                });
            });
        });
    }
}
