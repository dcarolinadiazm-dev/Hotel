import knex from 'knex';
import knexFirebirdDialect from 'knex-firebird-dialect';
import dotenv from 'dotenv';
const Firebird = require('node-firebird');

dotenv.config();

export const dbOptions: any = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3050'),
    database: process.env.DB_PATH || 'C:\\SYSplus2025\\Datos\\EMP\\SYSPLUS.FDB',
    user: process.env.DB_USER || 'SYSDBA',
    password: process.env.DB_PASSWORD || 'masterkey',
    pageSize: 4096,
    lowercase_keys: false,
    charset: process.env.DB_CHARSET || 'ISO8859_1',
    encoding: process.env.DB_CHARSET || 'ISO8859_1',
    charSetForNONE: process.env.DB_CHARSET_NONE || 'latin1'
};

// Instancia principal de Knex con el dialecto de Firebird
export const db = knex({
    client: knexFirebirdDialect as any,
    connection: dbOptions,
    pool: {
        min: 2,
        max: 10
    },
    wrapIdentifier: (value, origImpl) => {
        if (value === '*') return value;
        return origImpl(value.toUpperCase());
    }
});

export { Firebird };
