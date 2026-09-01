import { db } from '../src/config/knex.config';

async function listArticles() {
  try {
    const arts = await db('ARTICULO').select('ARTI_COD', 'ARTI_DES').limit(5);
    console.log('ARTICLES:', arts);
  } catch (e: any) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}

listArticles();
