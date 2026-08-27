import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
const Firebird = require('node-firebird');

dotenv.config();

const dbOptions = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3050'),
    database: process.env.DB_PATH || 'C:\\SYSplus\\Datos\\AV1\\sysplus.fdb',
    user: process.env.DB_USER || 'SYSDBA',
    password: process.env.DB_PASSWORD || 'masterkey',
    pageSize: 4096
};

function execute(db: any, sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (err: any, res: any) => {
            if (err) return reject(err);
            resolve(res);
        });
    });
}

async function runMigration() {
    console.log(`====================================================`);
    console.log(`📦 INICIANDO MIGRACIÓN OFICIAL EN FIREBIRD`);
    console.log(`📁 Base de Datos: ${dbOptions.database}`);
    console.log(`====================================================`);

    Firebird.attach(dbOptions, async (err: any, db: any) => {
        if (err) {
            console.error('❌ Error conectando a la base de datos Firebird:', err.message);
            return;
        }

        try {
            // 1. Verificar y Crear Tabla HABITACION
            const checkHab = await execute(db, `SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 AND RDB$RELATION_NAME = 'HABITACION'`);

            if (!checkHab || checkHab.length === 0) {
                console.log('📌 Creando tabla HABITACION...');
                const createHabSql = `
                    CREATE TABLE HABITACION (
                        ID_HABITACION        VARCHAR(20) NOT NULL PRIMARY KEY,
                        ARTI_COD             VARCHAR(15),
                        NUMERO               VARCHAR(20) NOT NULL,
                        ESTADO               VARCHAR(30) DEFAULT 'Disponible' NOT NULL,
                        TIPO                 VARCHAR(50),
                        PISO                 INTEGER DEFAULT 1,
                        PRECIO_NOCHE         NUMERIC(15,2) DEFAULT 0,
                        NOTAS                VARCHAR(250),
                        FECHA_ACTUALIZACION  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FECHA_RESERVA        VARCHAR(50),
                        FECHA_SALIDA         VARCHAR(50),
                        CARACTERISTICAS      VARCHAR(250),
                        HUESPED              VARCHAR(100),
                        DOCUMENTO            VARCHAR(30),
                        PEWE_ID              INTEGER
                    )
                `;
                await execute(db, createHabSql);
                console.log('✅ Tabla HABITACION creada.');

                // Insertar habitaciones base
                const habitacionesBase = [
                    { id: '1', art: '001', num: '101', estado: 'Disponible', tipo: 'DOBLE', piso: 1, precio: 120000, caract: 'TV, NEVERA, JACUZZI' },
                    { id: '2', art: '001', num: '102', estado: 'Disponible', tipo: 'DOBLE', piso: 1, precio: 120000, caract: 'TV, NEVERA, JACUZZI' },
                    { id: '3', art: '001', num: '201', estado: 'Disponible', tipo: 'SENCILLA', piso: 2, precio: 90000, caract: 'TV, NEVERA' },
                    { id: '4', art: '001', num: '202', estado: 'Disponible', tipo: 'SENCILLA', piso: 2, precio: 90000, caract: 'TV, NEVERA' },
                    { id: '5', art: '001', num: '203', estado: 'Disponible', tipo: 'DOBLE', piso: 2, precio: 120000, caract: 'TV, NEVERA, JACUZZI' },
                    { id: '6', art: '001', num: '204', estado: 'Disponible', tipo: 'DOBLE', piso: 2, precio: 120000, caract: 'TV, NEVERA, JACUZZI' },
                    { id: '7', art: '001', num: '301', estado: 'Disponible', tipo: 'FAMILIAR', piso: 3, precio: 180000, caract: 'TV, NEVERA, 2 CAMAS' },
                    { id: '8', art: '001', num: '302', estado: 'Disponible', tipo: 'SENCILLA', piso: 3, precio: 90000, caract: 'TV, NEVERA' }
                ];

                for (const h of habitacionesBase) {
                    try {
                        await execute(db, `
                            INSERT INTO HABITACION (ID_HABITACION, ARTI_COD, NUMERO, ESTADO, TIPO, PISO, PRECIO_NOCHE, CARACTERISTICAS)
                            VALUES ('${h.id}', '${h.art}', '${h.num}', '${h.estado}', '${h.tipo}', ${h.piso}, ${h.precio}, '${h.caract}')
                        `);
                    } catch (e: any) {}
                }
                console.log('✅ Habitaciones base insertadas.');
            } else {
                console.log('ℹ️ La tabla HABITACION ya existe.');
            }

            // 2. Verificar y Crear Tabla HABITACION_MOVIM
            const checkMov = await execute(db, `SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 AND RDB$RELATION_NAME = 'HABITACION_MOVIM'`);
            if (!checkMov || checkMov.length === 0) {
                console.log('📌 Creando tabla HABITACION_MOVIM...');
                await execute(db, `
                    CREATE TABLE HABITACION_MOVIM (
                        ID_MOVIM             INTEGER NOT NULL PRIMARY KEY,
                        ID_HABITACION        VARCHAR(20) NOT NULL,
                        ARTI_COD             VARCHAR(15),
                        PEWE_ID              INTEGER,
                        PRECIO               NUMERIC(15,2) DEFAULT 0,
                        FECHA_RESERVA        VARCHAR(50),
                        FECHA_SALIDA         VARCHAR(50),
                        HUESPED              VARCHAR(100),
                        DOCUMENTO            VARCHAR(30),
                        ESTADO               VARCHAR(30) DEFAULT 'Activo',
                        FECHA_ACTUALIZACION  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                console.log('✅ Tabla HABITACION_MOVIM creada.');
            } else {
                console.log('ℹ️ La tabla HABITACION_MOVIM ya existe.');
            }

            // 3. Verificar y Crear Tabla HABITACION_MOVIM_ANTICIPOS
            const checkAnt = await execute(db, `SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 AND RDB$RELATION_NAME = 'HABITACION_MOVIM_ANTICIPOS'`);
            if (!checkAnt || checkAnt.length === 0) {
                console.log('📌 Creando tabla HABITACION_MOVIM_ANTICIPOS...');
                await execute(db, `
                    CREATE TABLE HABITACION_MOVIM_ANTICIPOS (
                        ID_MOVIM_ANT         INTEGER NOT NULL PRIMARY KEY,
                        ID_MOVIM             INTEGER NOT NULL,
                        ITEM_ID              INTEGER NOT NULL,
                        RECA_ID              INTEGER NOT NULL,
                        ANCL_ID              INTEGER NOT NULL,
                        MONTO                NUMERIC(15,2) NOT NULL,
                        FECHA                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        TERC_NIT             VARCHAR(20),
                        CONCEPTO             VARCHAR(150),
                        ESTADO               VARCHAR(20) DEFAULT 'Activo'
                    )
                `);
                console.log('✅ Tabla HABITACION_MOVIM_ANTICIPOS creada.');
            } else {
                console.log('ℹ️ La tabla HABITACION_MOVIM_ANTICIPOS ya existe.');
            }

            // 4. Generadores (Sequences)
            const generators = ['ID_HABITACION', 'ID_HAB_MOVIM'];
            for (const gen of generators) {
                try {
                    await execute(db, `CREATE GENERATOR ${gen}`);
                    console.log(`✅ Generador ${gen} creado.`);
                } catch (e: any) {
                    // Generador ya existe
                }
            }

            // 5. Compilar Procedimiento GRABE_DOCUMENTO_INV_WEB
            const procPath = path.join(__dirname, '../src/procedimiento_nuevo.sql');
            if (fs.existsSync(procPath)) {
                const procSql = fs.readFileSync(procPath, 'utf8');
                try {
                    await execute(db, procSql);
                    console.log('✅ Procedimiento GRABE_DOCUMENTO_INV_WEB compilado exitosamente.');
                } catch (spErr: any) {
                    console.warn('Aviso procedimiento GRABE_DOCUMENTO_INV_WEB:', spErr.message);
                }
            }

            console.log(`====================================================`);
            console.log(`🎉 MIGRACIÓN FINALIZADA CON ÉXITO`);
            console.log(`====================================================`);
        } catch (error: any) {
            console.error('❌ Error ejecutando migración:', error.message);
        } finally {
            db.detach();
        }
    });
}

runMigration();
