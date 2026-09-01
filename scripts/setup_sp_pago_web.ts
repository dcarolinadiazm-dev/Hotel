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
    let rawSql = fs.readFileSync(path.join(__dirname, '../src/GRABE_DOCUMENTO_INV_WEB_PROD.SQL'), 'utf-8');

    // Declarar PAGO_MONTO en el SP
    if (!rawSql.includes('PAGO_MONTO')) {
      rawSql = rawSql.replace(
        'declare variable NUMBCO varchar(20);',
        'declare variable NUMBCO varchar(20);\ndeclare variable PAGO_MONTO numeric(18,2);'
      );
    }

    // Reemplazar la sección if (contado = 'S') then ... end
    const oldBlockRegex = /if\s*\(contado\s*=\s*'S'\)\s*then[\s\S]*?insert\s+into\s+FACTURAS_CONTADO_PAGO[\s\S]*?end/i;

    const newBlock = `if (contado = 'S') then
        begin
        /* grabe el recibo */
        SELECT FIRST 1 CAJA_ID FROM punto_venta WHERE PTVT_ID = :PTOVTA INTO :CAJA;
        if (CAJA is null) then SELECT FIRST 1 CAJA_ID FROM cajas INTO :CAJA;
        if (CAJA is null) then CAJA = 1;

        if (EXISTS (SELECT DINW_ID FROM DOC_INVENTARIO_PAGO_WEB WHERE DINW_ID = :ID)) THEN
            BEGIN
            FOR SELECT DIWP_ITEM, FOPA_ID, DIWP_MONTO, DIWP_BANCO, DIWP_CUENTA, DIWP_NUMERO
                FROM DOC_INVENTARIO_PAGO_WEB
                WHERE DINW_ID = :ID
                ORDER BY DIWP_ITEM
                INTO :ITEM, :FORMAP, :PAGO_MONTO, :CODBCO, :CTABCO, :NUMBCO
            DO
            BEGIN
                if (CODBCO is null) then CODBCO = '';
                if (CTABCO is null) then CTABCO = '';
                if (NUMBCO is null) then NUMBCO = '';
                if (FORMAP <> 1 AND (NUMBCO = '' OR NUMBCO IS NULL)) then
                    BEGIN
                    CTABCO = '9999';
                    SELECT CAJA_FPBCO FROM CAJAS C WHERE CAJA_ID = :CAJA INTO :CODBCO;
                    select max(rcpa_numero) from recibos_caja_pago where rcpa_banco = :CODBCO and rcpa_cuenta = '9999' INTO :NUMBCO;
                    if (NUMBCO is null) then NUMBCO = '000001';
                    END
                insert into FACTURAS_CONTADO_PAGO (FCNT_ID, FCNP_ITEM, FOPA_ID, FCNP_BANCO, FCNP_CUENTA, FCNP_NUMERO, FCNP_FECHA, FCNP_MONTO, FCNP_ANULADO, FCNP_CERRADO)
                    values (:iddoc, :ITEM, :formap, :codbco, :ctabco, :numbco, :FECHA, :PAGO_MONTO, 'N', 'N');
            END
            END
        ELSE
            BEGIN
            if (FORMAP <> 1) then
                BEGIN
                CTABCO = '9999';
                SELECT CAJA_FPBCO FROM CAJAS C WHERE CAJA_ID = :CAJA INTO :CODBCO;
                select max(rcpa_numero) from recibos_caja_pago where rcpa_banco = :CODBCO and rcpa_cuenta = '9999' INTO :NUMBCO;
                END
            ELSE
                BEGIN
                CODBCO = '';
                CTABCO = '';
                NUMBCO = '';
                END
            insert into FACTURAS_CONTADO_PAGO (FCNT_ID, FCNP_ITEM, FOPA_ID, FCNP_BANCO, FCNP_CUENTA, FCNP_NUMERO, FCNP_FECHA, FCNP_MONTO, FCNP_ANULADO, FCNP_CERRADO)
                values (:iddoc, 1, :formap, :codbco, :ctabco, :numbco, :FECHA, :total, 'N', 'N');
            END
        end`;

    if (!oldBlockRegex.test(rawSql)) {
      throw new Error('Regex oldBlockRegex does not match SQL text!');
    }

    const updatedSql = rawSql.replace(oldBlockRegex, newBlock);
    const finalSpSql = updatedSql.replace(/CREATE\s+PROCEDURE/i, 'CREATE OR ALTER PROCEDURE');

    // Guardar también en GRABE_DOCUMENTO_INV_WEB_PROD.SQL para referencia
    fs.writeFileSync(path.join(__dirname, '../src/GRABE_DOCUMENTO_INV_WEB_PROD.SQL'), updatedSql, 'utf-8');
    console.log('Saved updated SQL to GRABE_DOCUMENTO_INV_WEB_PROD.SQL.');

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
