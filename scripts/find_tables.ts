import { db } from '../src/config/knex.config';

async function findTables() {
  try {
    const tablesRes = await db.raw(`
      SELECT RDB$RELATION_NAME
      FROM RDB$RELATIONS
      WHERE RDB$SYSTEM_FLAG = 0
      AND (RDB$RELATION_NAME LIKE '%PAGO%' OR RDB$RELATION_NAME LIKE '%DOC%' OR RDB$RELATION_NAME LIKE '%WEB%')
      ORDER BY RDB$RELATION_NAME
    `);
    
    const rows = (tablesRes.rows || tablesRes).map((r: any) => r.RDB$RELATION_NAME.trim());
    console.log('MATCHING TABLES:', rows);
  } catch (e: any) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}

findTables();
