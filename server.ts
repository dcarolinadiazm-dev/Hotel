import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './src/routes';
import { dbOptions } from './src/config/knex.config';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globales
app.use(cors({
    origin: '*',
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Montaje de rutas de la API bajo /api
app.use('/api', apiRoutes);

// Manejador de rutas no encontradas
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `Ruta ${req.method} ${req.originalUrl} no encontrada` });
});

// Manejador global de errores
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('💥 Error no controlado en el servidor:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor'
    });
});

// Iniciar Servidor
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 SERVIDOR HOTEL INICIADO`);
    console.log(`📡 URL API: http://localhost:${PORT}/api`);
    console.log(`📦 DB Firebird: ${dbOptions.host}:${dbOptions.port}`);
    console.log(`📁 Archivo FDB: ${dbOptions.database}`);
    console.log(`🏗️ Arquitectura: Knex + Controllers + Services + Routes`);
    console.log(`====================================================`);
});
