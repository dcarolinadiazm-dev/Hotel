import { db } from '../src/config/knex.config';
import fs from 'fs';
import path from 'path';

async function testProcedure() {
    try {
        const sqlPath = path.join(__dirname, '../src/procedimiento_nuevo.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        console.log('Compilando GRABE_DOCUMENTO_INV_WEB en Firebird...');
        await db.raw(sqlContent);
        console.log('✅ Procedimiento GRABE_DOCUMENTO_INV_WEB compilado exitosamente en Firebird!');
    } catch (e: any) {
        console.error('❌ Error compilando procedimiento:', e.message);
    }
    process.exit(0);
}

testProcedure();
