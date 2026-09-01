CREATE OR ALTER PROCEDURE GRABE_DOCUMENTO_INV_WEB (
    TIPO INTEGER,
    ID INTEGER)
RETURNS (
    NUMDOC VARCHAR(20),
    NERROR INTEGER,
    IDDOC INTEGER)
AS
declare variable IDINTER INTEGER;
declare variable PREF VARCHAR(4);
declare variable NUMERO VARCHAR(8);
declare variable CLIENTE VARCHAR(20);
declare variable NIT VARCHAR(20);
declare variable SUCURSAL VARCHAR(20);
declare variable FECHA DATE;
declare variable VENCE DATE;
declare variable CONCEPTO VARCHAR(60);
declare variable OBS VARCHAR(250);
declare variable IMPINC CHAR(1);
declare variable IVAINC CHAR(1);
declare variable BASE NUMERIC(18,2);
declare variable IVATOT NUMERIC(18,2);
declare variable TOTAL NUMERIC(18,2);
declare variable FORMAP INTEGER;
declare variable VEND INTEGER;
declare variable PTOVTA INTEGER;
declare variable BODEGA VARCHAR(10);
declare variable LISTA INTEGER;
declare variable NOMTERC VARCHAR(60);
declare variable RTFTEPORC NUMERIC(18,2);
declare variable RTICAPORC NUMERIC(18,2);
declare variable RTIVAPORC NUMERIC(18,2);
declare variable RTFTE NUMERIC(18,2);
declare variable RTEFTE NUMERIC(18,2);
declare variable RTEICA NUMERIC(18,2);
declare variable RTEIVA NUMERIC(18,2);
declare variable AUTORIZACION VARCHAR(10);
declare variable ITEM INTEGER;
declare variable ARTICULO VARCHAR(20);
declare variable CANT NUMERIC(18,4);
declare variable UNIDAD VARCHAR(10);
declare variable LOTE VARCHAR(20);
declare variable COSTO NUMERIC(18,4);
declare variable DTOPORC NUMERIC(18,2);
declare variable IVAPORC NUMERIC(18,2);
declare variable CONSUMO NUMERIC(18,4);
declare variable FACTOR NUMERIC(18,4);
declare variable DESCRIPCION VARCHAR(60);
declare variable OBSITE VARCHAR(250);
declare variable CODBAR VARCHAR(20);
declare variable REFITE VARCHAR(20);
declare variable IVAMONTO NUMERIC(18,2);
declare variable CONTADO CHAR(1);
declare variable CAJA INTEGER;
declare variable CODBCO VARCHAR(20);
declare variable CTABCO VARCHAR(20);
declare variable NUMBCO VARCHAR(20);
declare variable VER CHAR(1);
declare variable IDC INTEGER;
declare variable TIVA INTEGER;
declare variable IMPBA NUMERIC(18,2);
declare variable IMPUP NUMERIC(18,2);
declare variable IMPUPP NUMERIC(18,2);
declare variable IMPUPM NUMERIC(18,2);
declare variable INALCP NUMERIC(18,4);
declare variable INALCM NUMERIC(18,4);
declare variable DTO1 NUMERIC(18,2);
declare variable DTO2 NUMERIC(18,2);
declare variable DTO3 NUMERIC(18,2);
declare variable DTO1M NUMERIC(18,2);
declare variable DTO2M NUMERIC(18,2);
declare variable DTO3M NUMERIC(18,2);
declare variable PREFR VARCHAR(4);
declare variable PAGO_MONTO NUMERIC(18,2);
declare variable TIPOREF integer;
declare variable NUMREF varchar(20);
declare variable DTOMONTO numeric(18,2);
declare variable PREFREF varchar(4);
declare variable IDREF integer;
declare variable ADICIONAL numeric(18,2);
declare variable EXTRA numeric(18,2);
declare variable INALC numeric(18,2);
declare variable DTOFFEC date;
declare variable BODRETAL integer;
declare variable CERROR char(1);
declare variable SALDO_PAGO numeric(18,2);
begin
if (TIPO = 31) then
    BEGIN
    /* FACTURA VENTA */
    IDDOC = GEN_ID(id_factura, 1);
    select DINW_PREF, DINW_BODEGA, DINW_FECHA, DINW_CONCEPTO, DINW_TIPOREF, DINW_NUMREF, DINW_OBS, DINW_IMPINC, DINW_NIT, DINW_DTOPORC,
        DINW_DTOMONTO, DINW_FORMAP, DINW_SUCURSAL, DINW_PTVTA, DINW_VEND, DINW_VENCE, D.dinw_rtfteporc, D.dinw_rtivaporc, D.dinw_rticaporc,
        D.dinw_dtoporc, D.dinw_adicional, D.dinw_extra, D.dinw_inalc, D.dinw_impba, D.dinw_impup, D.dinw_contado, D.DINW_DTOFFEC
        FROM doc_inventario_web D WHERE D.dinw_id = :ID
        INTO :PREF, :BODEGA, :FECHA, :CONCEPTO, :TIPOREF, :NUMREF, :OBS, :impinc, :NIT, :DTOPORC,
        :DTOMONTO, :formap, :SUCURSAL, :PTOVTA, :vend, :VENCE, :rtfteporc, :rtivaporc, :rticaporc,
        :dtoporc, :adicional, :extra, :inalc, :impba, :impup, :contado, :dtoffec;

    if (impinc is null) then impinc = 'S';
    if (contado is null) then contado = 'S';

    if ((TIPOREF = 32) AND (NUMREF <> '')) then
        BEGIN
        select pref_ivainc from prefijos where tido_cod = 31 and pref_pre = :pref into :ivainc;
        PREFREF = LEFT(NUMREF, CHAR_LENGTH(NUMREF) - 6);
        NUMREF = right(NUMREF, 6);
        SELECT REVT_ID, VEND_COD, REVT_SUCURSAL
            FROM remisiones_venta P WHERE pref_pre = :PREFREF AND revt_numero = :NUMREF INTO :IDREF, :vend, :SUCURSAL;
        IDC = GEN_ID(id_cons, 1);
        INSERT INTO CONSOLIDE_FALTANTES (CEFA_ID, CEFA_ITEM, CEFA_TIPODES, CEFA_TIPOORI, CEFA_IDORI)
            VALUES (:IDC, 1, 31, 32, :idref);
        EXECUTE PROCEDURE consolide_pendientes (:IDC);
        END
    ELSE
        if ((TIPOREF = 34) AND (NUMREF <> '')) then
            BEGIN
            PREFREF = LEFT(NUMREF, CHAR_LENGTH(NUMREF) - 6);
            NUMREF = right(NUMREF, 6);
            SELECT PEDI_ID, VEND_COD, PEDI_SUCURSAL
                FROM PEDIDOS P WHERE pref_pre = :PREFREF AND pedi_numero = :NUMREF INTO :IDREF, :vend, :SUCURSAL;
            IDC = GEN_ID(id_cons, 1);
            INSERT INTO CONSOLIDE_FALTANTES (CEFA_ID, CEFA_ITEM, CEFA_TIPODES, CEFA_TIPOORI, CEFA_IDORI)
                VALUES (:IDC, 1, 31, 34, :idref);
            EXECUTE PROCEDURE consolide_pendientes (:IDC);
            END
        ELSE
            begin
            IDC = 0;
            NUMREF = '';
            end
    select D.DINW_BASE, D.DINW_IVAMONTO, D.DINW_MONTO from DOC_INVENTARIO_WEB D where D.DINW_ID = :id into :BASE, :ivatot, :total;
    if (BASE is null or total is null or total = 0) then
    begin
        execute procedure calcula_total_e_iva(:id) returning_values (:BASE, :ivatot, :total);
        BASE = BASE - :dtomonto;
        total = BASE + ivatot;
    end
    RTEFTE = (:BASE * (CAST(:RTFTEPORC AS FLOAT) / 100));
    RTFTE = RTEFTE;
    RTEICA = (:BASE * (:rticaporc / 1000.0));
    RTEIVA = (:ivatot * (:rtivaporc/100));
    SELECT TERC_NOM, VEND_COD FROM terceros T, CLIENTES C WHERE T.terc_nit = C.terc_nit AND T.TERC_NIT = :nit INTO :nomterc, :VEND;
    IF ((PTOVTA IS NULL) OR (PTOVTA = 0)) THEN
        SELECT FIRST 1 PTVT_ID, BODE_COD FROM punto_venta WHERE PTVT_ACTIVO = 'S' INTO :PTOVTA, :BODEGA;
    IF ((PTOVTA IS NULL) OR (PTOVTA = 0)) THEN
        SELECT FIRST 1 PTVT_ID, BODE_COD FROM punto_venta INTO :PTOVTA, :BODEGA;
    IF ((BODEGA IS NULL) OR (BODEGA = '') OR NOT EXISTS (SELECT BODE_COD FROM BODEGA WHERE BODE_COD = :BODEGA)) THEN
        SELECT BODE_COD FROM punto_venta WHERE PTVT_ID = :PTOVTA INTO :BODEGA;
    IF ((BODEGA IS NULL) OR (BODEGA = '') OR NOT EXISTS (SELECT BODE_COD FROM BODEGA WHERE BODE_COD = :BODEGA)) THEN
        SELECT FIRST 1 BODE_COD FROM BODEGA WHERE BODE_FACTURA = 'S' OR BODE_ACTIVA = 'S' INTO :BODEGA;
    IF ((BODEGA IS NULL) OR (BODEGA = '') OR NOT EXISTS (SELECT BODE_COD FROM BODEGA WHERE BODE_COD = :BODEGA)) THEN
        SELECT FIRST 1 BODE_COD FROM BODEGA INTO :BODEGA;
    if (BODEGA IS NULL OR BODEGA = '') then BODEGA = '1';

    SELECT FIRST 1 LIPR_COD FROM lista_precios L, USUARIO U WHERE L.lipr_predet = 'S' AND U.user_cod = USER AND ((L.sucu_id = U.sucu_id) or (U.sucu_id = 0) or (L.sucu_id = 0)) INTO :LISTA;
    select pref_actual from prefijos where tido_cod = 31 and pref_pre = :pref into :numero;
    if (numero is null or numero = '') then numero = '00000001';
    select FIRST 1 a.auto_numero from autorizaciones a
        where a.pref_pre = :pref and a.tido_cod = 31 and a.auto_fecha <= :fecha and a.auto_vence >= :fecha
        order by a.auto_vence desc into :autorizacion;
    insert into FACTURAS (FACT_ID, PTVT_ID, VEND_COD, TERC_NIT, AUTO_NUMERO, FACT_NUMERO, FACT_FECHA, FACT_DESPACHO,
                          FACT_VENCE, FACT_IVAINC, FACT_COMIPORC, FACT_COMIMONTO, FACT_DTOPOR, FACT_DTOMONTO,
                          FACT_ADICIONAL, FACT_IVAMONTO, FACT_RTFTEPOR, FACT_RTFTEMONTO, FACT_RTIVAPOR, FACT_RTIVAMONTO,
                          FACT_RTICAPOR, FACT_RTICAMONTO, FACT_EXTRA, FACT_DTOFPOR, FACT_DTOFMONTO, FACT_DTOFFECHA,
                          PREF_PRE, FACT_TRANSP, FACT_NOMCLIENTE, FACT_COTIZACI, FACT_PEDIDO, FACT_REMISION, FACT_ANULADO,
                          FACT_TRANSMIT, FACT_TOTAL, BODE_COD, FACT_OBS, VEHI_COD, FACT_CONSOLIDA, FACT_RECIBIDO,
                          FACT_USUARIO, FACT_SUCURSAL, NUMOK, COBR_COD, FACT_FACTOR, FACT_DETCLI, FACT_DETCLINOM,
                          FACT_DTOIT1, FACT_DTOIT2, FACT_DTOIT3, FACT_TRM, FACT_ANTICIPO, FACT_INTERFAZ, FACT_CANT,
                          FACT_FECINI, FACT_FECFIN, FACT_DEC2799, FACT_RTCREE, FACT_RTCREEM, FACT_ENTREGA, FACT_NOMTERC,
                          FACT_COMANDA, FACT_IMAGEN, FACT_FLETE, FACT_IDFLETE, FACT_MONEDA, TEEN_COD, TEPA_COD,
                          FACT_REFERENCIA, FACT_PROY, FACT_CENTRO, FACT_SUBC, FACT_TIPOENTREGA, ACFJ_COD, FACT_NEGOCIO,
                          FACT_PMA, FACT_IMPFIS, FACT_SUBTOTAL, FACT_AUTOCAR, FACT_AUTOCUPO, FACT_PTOSCLIFAC, FACT_CUFE,
                          FACT_XML, FACT_REPGRA, FACT_ORDENCLI, FACT_ESTADO, FACT_ESTOBS, FACT_IMPLICA, FACT_CLIEXE,
                          FACT_DIAIVA, FACT_FORMAP, FACT_FECHADIAN, FACT_CONTADO, FACT_PROFORMA, FACT_UUID, FACT_IMPBA,
                          FACT_IMPUP)
        values (:iddoc, :ptovta, :vend, :nit, :autorizacion, :numero, :fecha, NULL,
                :vence, :impinc, 0, 0, 0, 0,
                0, :ivatot, :rtfteporc, :rtfte, :rtivaporc, :rteiva,
                :rticaporc, :rteica, 0, 0, 0, :fecha,
                :pref, NULL, :nomterc, NULL, NULL, NULL, 'N',
                'N', :total, :bodega, :OBS, NULL, 0, 0,
                USER, :sucursal, 'N', :vend, 1, 'N', NULL,
                0, 0, 0, 1, 0, NULL, NULL,
                NULL, NULL, 0, 0, 0, NULL, :nomterc,
                NULL, NULL, 'N', 0, 1, NULL, NULL,
                NULL, NULL, NULL, NULL, 1, NULL, NULL,
                'N', NULL, :base, NULL, NULL, 0, NULL,
                NULL, NULL, NULL, 0, NULL, 'S', 'S',
                'N', :formap, NULL, NULL, NULL, NULL, 0,
                0);

    ITEM = 0;
    FOR SELECT DIWD_ITEM, DIWD_ARTICULO, DIWD_CANT, DIWD_UNIDAD, DIWD_LOTE, DIWD_PRUNIT, DIWD_DTOPORC, DIWD_IVAPORC, DIWD_CONSUMO,
               DIWD_FACTOR, DIWD_DESCART, DIWD_OBS, DIWD_CODBAR, DIWD_REF, DIWD_BODEGA, DIWD_LISTA, DIWD_TIVA, DIWD_IMPBA, DIWD_IMPUP,
               DIWD_IMPUPP, DIWD_INALCP, DIWD_INALCM, DIWD_IMPUPM, DIWD_DTO1, DIWD_DTO2, DIWD_DTO3, DIWD_DTOM1, DIWD_DTOM2, DIWD_DTOM3
        FROM DOC_INVENTARIO_DET_WEB WHERE DINW_ID = :ID INTO :ITEM, :articulo, :cant, :unidad, :lote, :costo, :dtoporc, :ivaporc, :consumo,
               :factor, :descripcion, :obsite, :codbar, :refite, :bodega, :lista, :tiva, :impba, :impup,
               :impupp, :inalcp, :inalcm, :impupm, :dto1, :dto2, :dto3, :dto1m, :dto2m, :dto3m DO
        BEGIN
        if (BODEGA IS NULL OR BODEGA = '' OR NOT EXISTS (SELECT BODE_COD FROM BODEGA WHERE BODE_COD = :BODEGA)) then
        begin
            SELECT FIRST 1 BODE_COD FROM BODEGA WHERE BODE_FACTURA = 'S' OR BODE_ACTIVA = 'S' INTO :BODEGA;
            IF (BODEGA IS NULL OR BODEGA = '') THEN SELECT FIRST 1 BODE_COD FROM BODEGA INTO :BODEGA;
            IF (BODEGA IS NULL OR BODEGA = '') THEN BODEGA = '1';
        end

        TOTAL = CANT * COSTO;
        if (IMPINC = 'S') then
          BEGIN
          IVAMONTO = TOTAL * (IVAPORC / 100);
          TOTAL = TOTAL + IVAMONTO;
          END
         ELSE
           BEGIN
          IVAMONTO = (TOTAL - (CONSUMO * CANT)) / (100 + IVAPORC);
          IVAMONTO = IVAMONTO * IVAPORC;
          END
        insert into FACTURAS_DETALLE (FACT_ID, FADE_ITEM, BODE_COD, ARTI_COD, FADE_CANT, FADE_UNIDAD, FADE_LOTE, FADE_PRUNIT,
                                      FADE_DTOPORC, FADE_DTOMONTO, FADE_IVAPORC, FADE_IVAMONTO, FADE_CONSUMO, FADE_FACTOR,
                                      FADE_DESC, FADE_OBS, FADE_CODBAR, FADE_REMISIONADO, FADE_DEVUELTO, FADE_TOTAL, LIPR_COD,
                                      FADE_REFERENCIA, FADE_ANULADO, FADE_TRANSMIT, FADE_FACTORLISTA, FADE_DTO1, FADE_DTO2,
                                      FADE_DTO3, FADE_DTOM1, FADE_DTOM2, FADE_DTOM3, FADE_CAJAS, FADE_BASE, FADE_PORCBASE,
                                      FADE_TIVA, FADE_INALCP, FADE_INALCM, FADE_MOTDEV, FADE_CONSIGNA, FADE_NITCONSIGNA,
                                      FADE_AHORRO, FADE_IDDTO, FADE_DIAIVA, FADE_MANDANTE, FADE_IMPUPP, FADE_IMPUPM, FADE_IMPBA)
        values (:iddoc, :ITEM, :bodega, :articulo, :CANT, :UNIDAD, :LOTE, :costo,
                :DTOPORC, (:costo * (:dtoporc / 100)), :ivaporc, :IVAMONTO, (:CONSUMO * :cant), :factor,
                :descripcion, :obsite, :CODBAR, 0, 0, :TOTAL, :lista,
                :refite, 'N', 'N', 0, :dto1, :DTO2,
                :DTO3, 0, 0, 0, 1, 0, 0,
                :TIVA, :inalcp, :inalcm, NULL, 0, NULL,
                0, 0, 'N', NULL, :impupp, :impupm, :impba);
        END
    UPDATE doc_inventario_web D SET D.dinw_iddoc = :iddoc WHERE D.dinw_id = :ID;
    SELECT PREF_PRE || FACT_NUMERO FROM FACTURAS WHERE FACT_ID = :iddoc INTO :numdoc;

    select a.auto_contado from autorizaciones a, facturas f where a.pref_pre = f.pref_pre and a.auto_numero = f.auto_numero and f.fact_id = :iddoc into :contado;
    if (contado = 'S') then
        begin
        SALDO_PAGO = :TOTAL;
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
                if (PAGO_MONTO > SALDO_PAGO) then PAGO_MONTO = SALDO_PAGO;
                
                if (PAGO_MONTO > 0) then
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
                    SALDO_PAGO = SALDO_PAGO - PAGO_MONTO;
                END
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
        end

    NERROR = 0;
    select max(inve_id) from interfaz_ventas where tido_cod = 31 and pref_pre = :pref into :idinter;
    execute procedure contabil_factura(:IDDOC, :IDINTER, 0) returning_values (:NERROR, :VER, :IDC);
    if (NERROR = 0 and IDC is not null and IDC > 0) then
        execute procedure CONTABILIZA_PENDIENTE(:IDC);
    suspend;
    END

end