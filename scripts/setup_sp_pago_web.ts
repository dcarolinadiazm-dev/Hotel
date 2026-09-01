import { db } from '../src/config/knex.config';
import fs from 'fs';
import path from 'path';

async function setupSPAndTable() {
  try {
    console.log('1. Creating table DOC_INVENTARIO_PAGO_WEB if not exists...');
    const tableCheck = await db.raw(`
      SELECT RDB$RELATION_NAME
      FROM RDB$RELATIONS
      WHERE RDB$RELATION_NAME = 'DOC_INVENTARIO_PAGO_WEB'
    `);
    
    if ((tableCheck.rows || tableCheck).length === 0) {
      await db.raw(`
        CREATE TABLE DOC_INVENTARIO_PAGO_WEB (
            DINW_ID INTEGER NOT NULL,
            DIWP_ITEM INTEGER NOT NULL,
            FOPA_ID INTEGER NOT NULL,
            DIWP_MONTO NUMERIC(18,2) DEFAULT 0 NOT NULL,
            DIWP_BANCO VARCHAR(20),
            DIWP_CUENTA VARCHAR(20),
            DIWP_NUMERO VARCHAR(20),
            CONSTRAINT PK_DOC_INVENTARIO_PAGO_WEB PRIMARY KEY (DINW_ID, DIWP_ITEM)
        );
      `);
      console.log('Table DOC_INVENTARIO_PAGO_WEB CREATED!');
    } else {
      console.log('Table DOC_INVENTARIO_PAGO_WEB already exists.');
    }

    console.log('2. Reading GRABE_DOCUMENTO_INV_WEB_PROD.SQL...');
    const rawSql = fs.readFileSync(path.join(__dirname, '../src/GRABE_DOCUMENTO_INV_WEB_PROD.SQL'), 'utf-8');

    // Cambiar CREATE PROCEDURE por CREATE OR ALTER PROCEDURE si es necesario
    const finalSpSql = rawSql.replace(/^CREATE\s+PROCEDURE/im, 'CREATE OR ALTER PROCEDURE');

    console.log('3. Executing CREATE OR ALTER PROCEDURE GRABE_DOCUMENTO_INV_WEB...');
    await db.raw(finalSpSql);
    console.log('PROCEDURE GRABE_DOCUMENTO_INV_WEB UPDATED SUCCESSFULLY!');

  } catch (e: any) {
    console.error('SETUP ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}

setupSPAndTable();
