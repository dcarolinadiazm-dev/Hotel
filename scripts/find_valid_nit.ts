import { db } from '../src/config/knex.config';

async function findValidNit() {
  try {
    const cli = await db('CLIENTES').first();
    console.log('VALID CLIENT:', cli);
  } catch (e: any) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}

findValidNit();
