import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
const Firebird = require('node-firebird');

dotenv.config();

const dbOptions = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3050'),
    database: process.env.DB_PATH || 'C:\\SYSplus2025\\Datos\\EMP\\SYSPLUS.FDB',
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
    console.log(`📦 INICIANDO MIGRACIÓN OFICIAL EN FIREBIRD (EMP)`);
    console.log(`📁 Base de Datos: ${dbOptions.database}`);
    console.log(`====================================================`);

    Firebird.attach(dbOptions, async (err: any, db: any) => {
        if (err) {
            console.error('❌ Error conectando a la base de datos Firebird:', err.message);
            return;
        }

        try {
            // 1. Verificar tabla HABITACION
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
                    await execute(db, `
                        INSERT INTO HABITACION (ID_HABITACION, ARTI_COD, NUMERO, ESTADO, TIPO, PISO, PRECIO_NOCHE, CARACTERISTICAS)
                        VALUES ('${h.id}', '${h.art}', '${h.num}', '${h.estado}', '${h.tipo}', ${h.piso}, ${h.precio}, '${h.caract}')
                    `);
                }
                console.log('✅ Habitaciones base insertadas.');
            } else {
                console.log('ℹ️ La tabla HABITACION ya existe.');

                // Asegurar columnas requeridas si no existen
                const cols = [
                    { name: 'ARTI_COD', type: 'VARCHAR(15)' },
                    { name: 'PEWE_ID', type: 'INTEGER' },
                    { name: 'HUESPED', type: 'VARCHAR(100)' },
                    { name: 'DOCUMENTO', type: 'VARCHAR(30)' },
                    { name: 'FECHA_RESERVA', type: 'VARCHAR(50)' },
                    { name: 'FECHA_SALIDA', type: 'VARCHAR(50)' },
                    { name: 'CARACTERISTICAS', type: 'VARCHAR(250)' },
                    { name: 'PRECIO_NOCHE', type: 'NUMERIC(15,2) DEFAULT 0' },
                ];

                for (const col of cols) {
                    try {
                        await execute(db, `ALTER TABLE HABITACION ADD ${col.name} ${col.type}`);
                        console.log(`✅ Columna ${col.name} agregada a HABITACION.`);
                    } catch (e: any) {
                        // Columna ya existe
                    }
                }
            }

            // 2. Verificar tabla HABITACION_MOVIM
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

            // 3. Verificar tabla PEDIDO_WEB
            const checkPewe = await execute(db, `SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 AND RDB$RELATION_NAME = 'PEDIDO_WEB'`);
            if (!checkPewe || checkPewe.length === 0) {
                console.log('📌 Creando tabla PEDIDO_WEB...');
                await execute(db, `
                    CREATE TABLE PEDIDO_WEB (
                        PEWE_ID           INTEGER NOT NULL PRIMARY KEY,
                        PEWE_FECHA        DATE,
                        TERC_NIT          VARCHAR(20),
                        PEWE_SUCURSAL     VARCHAR(2),
                        PEWE_OBS          BLOB SUB_TYPE 1 SEGMENT SIZE 80,
                        PEWE_ENTREGA      DATE,
                        PEWE_DIASCR       INTEGER,
                        VEND_COD          INTEGER,
                        PEWE_DTOPORC      NUMERIC(9,4) DEFAULT 0,
                        PEWE_ADICIONAL    NUMERIC(18,2) DEFAULT 0,
                        PEWE_EXTRA        NUMERIC(18,2) DEFAULT 0,
                        PEWE_IVAMONTO     NUMERIC(18,2) DEFAULT 0,
                        PEWE_TOTAL        NUMERIC(18,2) DEFAULT 0,
                        PEWE_RTFTEPORC    NUMERIC(9,4) DEFAULT 0,
                        PEWE_RTIVAPORC    NUMERIC(9,4) DEFAULT 0,
                        PEWE_RTICAPORC    NUMERIC(9,4) DEFAULT 0,
                        PEWE_PREF         VARCHAR(4),
                        PEWE_DTOMONTO     NUMERIC(18,2) DEFAULT 0,
                        PEWE_NUMPED       VARCHAR(12),
                        PEWE_IDPED        INTEGER,
                        PEWE_NOMCLI       VARCHAR(60),
                        PTVT_ID           INTEGER,
                        PEWE_EVENTO       INTEGER,
                        PEWE_AUTOCAR      INTEGER,
                        PEWE_AUTOCUPO     INTEGER,
                        PEWE_TIPOENTREGA  INTEGER,
                        PEWE_HORAENTREGA  TIME,
                        PEWE_IDOFFLINE    INTEGER,
                        PEWE_LATITUD      VARCHAR(40),
                        PEWE_LONGITUD     VARCHAR(40),
                        PEWE_ANULADO      CHAR(1) DEFAULT 'N'
                    )
                `);
                console.log('✅ Tabla PEDIDO_WEB creada.');
            } else {
                console.log('ℹ️ La tabla PEDIDO_WEB ya existe.');
            }

            // 4. Verificar tabla PEDIDO_WEB_DETALLE
            const checkPewd = await execute(db, `SELECT RDB$RELATION_NAME FROM RDB$RELATIONS WHERE RDB$SYSTEM_FLAG = 0 AND RDB$RELATION_NAME = 'PEDIDO_WEB_DETALLE'`);
            if (!checkPewd || checkPewd.length === 0) {
                console.log('📌 Creando tabla PEDIDO_WEB_DETALLE...');
                await execute(db, `
                    CREATE TABLE PEDIDO_WEB_DETALLE (
                        PEWE_ID          INTEGER NOT NULL,
                        PEWD_ITEM        INTEGER NOT NULL,
                        ARTI_COD         VARCHAR(15),
                        PEWD_CODBAR      VARCHAR(50),
                        BODE_COD         VARCHAR(3),
                        PEWD_CANT        NUMERIC(18,4) DEFAULT 0,
                        PEWD_UNIDAD      VARCHAR(5),
                        PEWD_FACTOR      NUMERIC(18,4) DEFAULT 1,
                        LIPR_COD         INTEGER,
                        PEWD_PRUNIT      NUMERIC(18,4) DEFAULT 0,
                        PEWD_DTOP        NUMERIC(9,4) DEFAULT 0,
                        PEWD_DTO1        NUMERIC(9,4) DEFAULT 0,
                        PEWD_DTO2        NUMERIC(9,4) DEFAULT 0,
                        PEWD_DTO3        NUMERIC(9,4) DEFAULT 0,
                        PEWD_IVAP        NUMERIC(9,4) DEFAULT 0,
                        PEWD_IVAMONTO    NUMERIC(18,2) DEFAULT 0,
                        PEWD_CONSUMO     NUMERIC(18,2) DEFAULT 0,
                        PEWD_TOTAL       NUMERIC(18,2) DEFAULT 0,
                        PEWD_REFERENCIA  VARCHAR(20),
                        PEWD_DTOM        NUMERIC(18,2) DEFAULT 0,
                        PEWD_DTO1M       NUMERIC(18,2) DEFAULT 0,
                        PEWD_DTO2M       NUMERIC(18,2) DEFAULT 0,
                        PEWD_DTO3M       NUMERIC(18,2) DEFAULT 0,
                        PEWD_DESC        VARCHAR(300),
                        PEWD_ANULADO     CHAR(1) DEFAULT 'N',
                        PRIMARY KEY (PEWE_ID, PEWD_ITEM)
                    )
                `);
                console.log('✅ Tabla PEDIDO_WEB_DETALLE creada.');
            } else {
                console.log('ℹ️ La tabla PEDIDO_WEB_DETALLE ya existe.');
            }

            // 5. Compilar procedimiento GRABE_PEDIDO_APP
            const procPath = path.join(__dirname, '../src/procedimiento.sql');
            if (fs.existsSync(procPath)) {
                const procSql = fs.readFileSync(procPath, 'utf8');
                try {
                    await execute(db, procSql);
                    console.log('✅ Procedimiento GRABE_PEDIDO_APP compilado y actualizado.');
                } catch (spErr: any) {
                    console.warn('Aviso procedimiento GRABE_PEDIDO_APP:', spErr.message);
                }
            }

            console.log(`====================================================`);
            console.log(`🎉 MIGRACIÓN OFICIAL FINALIZADA CON ÉXITO`);
            console.log(`====================================================`);
        } catch (error: any) {
            console.error('❌ Error ejecutando migración:', error.message);
        } finally {
            db.detach();
        }
    });
}

runMigration();
