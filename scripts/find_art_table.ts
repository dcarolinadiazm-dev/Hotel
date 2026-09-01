import { db } from '../src/config/knex.config';

async function findArtTable() {
  try {
    const res = await db.raw(`
      SELECT RDB$RELATION_NAME
      FROM RDB$RELATIONS
      WHERE RDB$SYSTEM_FLAG = 0
      AND RDB$RELATION_NAME LIKE '%ARTI%'
    `);
    console.log('ART TABLES:', (res.rows || res).map((r: any) => r.RDB$RELATION_NAME.trim()));
  } catch (e: any) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}

findArtTable();
