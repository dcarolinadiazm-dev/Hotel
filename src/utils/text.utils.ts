/**
 * Sanitiza texto eliminando acentos y caracteres no ASCII para compatibilidad
 * total con bases de datos Firebird configuradas con charset NONE / WIN1252 / ISO8859_1.
 * Evita caracteres extraños como "Ã³", "Ã±", "Ã¡", etc.
 */
export function sanitizeText(str?: string | null): string {
    if (!str) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Elimina tildes y diacríticos (á->a, é->e, í->i, ó->o, ú->u, ñ->n)
        .replace(/[^\x20-\x7E\r\n]/g, '') // Mantiene caracteres ASCII imprimibles estándar
        .trim();
}

/**
 * Trunca el texto garantizando un límite exacto de bytes para evitar desbordamientos
 * en campos como VARCHAR(60).
 */
export function truncateToBytes(str: string, maxBytes: number = 55): string {
    if (!str) return '';
    const clean = sanitizeText(str);
    const buf = Buffer.from(clean, 'utf8');
    if (buf.length <= maxBytes) return clean;
    return buf.subarray(0, maxBytes).toString('utf8').trim();
}
