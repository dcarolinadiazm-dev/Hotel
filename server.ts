require('./scripts/setup_bindings.js');

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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

// Servir frontend compilado de React
const clientDistPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
}

// Montaje de rutas de la API bajo /api
app.use('/api', apiRoutes);

// Fallback SPA para rutas cliente
app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: `Ruta ${req.method} ${req.originalUrl} no encontrada` });
    }
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
    }
    res.status(404).send('Frontend no compilado. Ejecute: npm run client:build');
});

// Manejador global de errores
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('💥 Error no controlado en el servidor:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor'
    });
});

import { HabitacionService } from './src/services/habitacion.service';

// Iniciar Servidor
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 SERVIDOR HOTEL INICIADO`);
    console.log(`📡 URL Sistema / API: http://localhost:${PORT}`);
    console.log(`📦 DB Firebird: ${dbOptions.host}:${dbOptions.port}`);
    console.log(`📁 Archivo FDB: ${dbOptions.database}`);
    console.log(`🏗️ Arquitectura: Knex + Controllers + Services + Routes`);
    console.log(`====================================================`);

    // Sincronización automática de estado 'Ocupada' para reservas de hoy
    HabitacionService.syncHabitacionesEstadoAutomatico().catch(() => {});
    setInterval(() => {
        HabitacionService.syncHabitacionesEstadoAutomatico().catch(() => {});
    }, 5 * 60 * 1000);
});
