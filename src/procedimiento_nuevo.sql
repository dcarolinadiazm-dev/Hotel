create or alter procedure GRABE_DOCUMENTO_INV_WEB (
    TIPO integer,
    ID integer)
returns (
    IDDOC integer,
    NUMDOC varchar(12),
    NERROR integer)
as
declare variable PREF varchar(4);
declare variable NUMERO varchar(8);
declare variable BODEGA varchar(2);
declare variable BODDES varchar(2);
declare variable FECHA date;
declare variable CONCEPTO varchar(60);
declare variable TIPOREF integer;
declare variable NUMREF varchar(12);
declare variable ORDEN varchar(12);
declare variable NUMORDEN varchar(12);
declare variable OBS varchar(1024);
declare variable PREFREF varchar(4);
declare variable IDREF integer;
declare variable ITEM integer;
declare variable ARTICULO varchar(20);
declare variable DESCRIPCION varchar(300);
declare variable DESCRIPARTI varchar(300);
declare variable DESVAR varchar(1);
declare variable CODBAR varchar(60);
declare variable CANT numeric(18,4);
declare variable UNIDAD varchar(8);
declare variable FACTOR numeric(18,4);
declare variable COSTO numeric(18,2);
declare variable LOTE varchar(20);
declare variable REFITE varchar(20);
declare variable NIT varchar(20);
declare variable VENCELOTE date;
declare variable OBSITE varchar(1024);
declare variable IDC integer;
declare variable PTOVTA integer;
declare variable LISTA integer;
declare variable IVAPORC numeric(18,2);
declare variable IVAMONTO numeric(18,2);
declare variable IMPINC numeric(18,2);
declare variable IMPINCP integer;
declare variable IMPBA numeric(18,2);
declare variable IMPUPPORC integer;
declare variable IMPUP numeric(18,2);
declare variable CONSUMO numeric(18,2);
declare variable TOTAL numeric(18,2);
declare variable DTOPORC numeric(18,2);
declare variable DTOMONTO numeric(18,2);
declare variable ADICIONAL numeric(18,2);
declare variable EXTRA numeric(18,2);
declare variable RTFTEPORC numeric(18,2);
declare variable RTFTEMONTO numeric(18,2);
declare variable RTIVAPORC numeric(18,2);
declare variable RTICAPORC numeric(18,2);
declare variable RTEFTE numeric(18,2);
declare variable RTEICA numeric(18,2);
declare variable RTEIVA numeric(18,2);
declare variable DIASP integer;
declare variable IVAINC varchar(1);
declare variable CONTADO varchar(1);
declare variable TRANSMIT varchar(1);
declare variable MONEDA integer;
declare variable TERMINOS integer;
declare variable FORMAP integer;
declare variable VENCE date;
declare variable IMPORTA integer;
declare variable NUMIMP varchar(12);
declare variable PROY varchar(4);
declare variable CENT varchar(4);
declare variable BASE numeric(18,2);
declare variable IVATOT numeric(18,2);
declare variable DTOFPORC numeric(18,2);
declare variable DTOFFEC date;
declare variable NOMTERC varchar(60);
declare variable SIMPL varchar(1);
declare variable STAND varchar(20);
declare variable PASADA integer;
declare variable VEND integer;
declare variable TIVA integer;
declare variable SUCURSAL varchar(10);
declare variable CUFE varchar(100);
declare variable DTO1 numeric(18,2);
declare variable DTO2 numeric(18,2);
declare variable DTO3 numeric(18,2);
declare variable IDINTER integer;
declare variable VER varchar(1);
declare variable NROPROV varchar(20);
declare variable ARTI varchar(20);
declare variable DESARTICULO varchar(300);
declare variable DESRETAL varchar(300);
declare variable PESO numeric(18,4);
declare variable TURNO integer;
declare variable OPER integer;
declare variable MAQUINA integer;
declare variable CODRETAL varchar(20);
declare variable AUTORIZACION varchar(20);
declare variable CANTRETAL numeric(18,4);
declare variable BODRETAL integer;
declare variable CAJA integer;
declare variable CODBCO varchar(2);
declare variable CTABCO varchar(20);
declare variable NUMBCO varchar(20);
begin
if (TIPO = 31) then
    BEGIN
    /* FACTURA VENTA */
    IDDOC = GEN_ID(id_factura, 1);
    select DINW_PREF, DINW_BODEGA, DINW_FECHA, DINW_CONCEPTO, DINW_TIPOREF, DINW_NUMREF, DINW_OBS, DINW_IMPINC, DINW_NIT, DINW_DTOPORC,
        DINW_DTOMONTO,DINW_FORMAP, DINW_SUCURSAL, DINW_PTVTA, DINW_VEND, DINW_VENCE, D.dinw_rtfteporc, D.dinw_rtivaporc, D.dinw_rticaporc,
        D.dinw_dtoporc, D.dinw_adicional, D.dinw_extra, D.dinw_inalc, D.dinw_impba, D.dinw_impup, D.dinw_contado, D.DINW_DTOFFEC
        FROM doc_inventario_web D WHERE D.dinw_id = :ID
        INTO :PREF, :BODEGA, :FECHA, :CONCEPTO, :TIPOREF, :NUMREF, :OBS, :ivainc, :NIT, :DTOPORC, :DTOMONTO, :formap, :SUCURSAL, :PTOVTA,
        :vend, :VENCE, :rtfteporc, :rtivaporc, :rticaporc, :dtoporc, :adicional, :extra, :impinc, :impba, :impup, :contado, :dtoffec;
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
    RTEICA = (:BASE * (:rticaporc / 1000.0));
    RTEIVA = (:ivatot * (:rtivaporc/100));
    SELECT TERC_NOM, VEND_COD FROM terceros T, CLIENTES C WHERE T.terc_nit = C.terc_nit AND T.TERC_NIT = :nit INTO :nomterc, :VEND;
    IF ((PTOVTA IS NULL) OR (PTOVTA = 0)) THEN
        SELECT FIRST 1 PTVT_ID, BODE_COD FROM punto_venta WHERE PTVT_ACTIVO = 'S' INTO :PTOVTA, :BODEGA;
    IF ((PTOVTA IS NULL) OR (PTOVTA = 0)) THEN
        SELECT FIRST 1 PTVT_ID, BODE_COD FROM punto_venta INTO :PTOVTA, :BODEGA;
    IF ((BODEGA IS NULL) OR (BODEGA = '')) THEN
        SELECT BODE_COD FROM punto_venta WHERE PTVT_ID = :PTOVTA INTO :BODEGA;
    IF ((BODEGA IS NULL) OR (BODEGA = '')) THEN
        SELECT FIRST 1 BODE_COD FROM BODEGA WHERE BODE_FACTURA = 'S' OR BODE_ACTIVA = 'S' INTO :BODEGA;
    IF ((BODEGA IS NULL) OR (BODEGA = '')) THEN
        SELECT FIRST 1 BODE_COD FROM BODEGA INTO :BODEGA;
    SELECT FIRST 1 LIPR_COD FROM lista_precios L, USUARIO U WHERE L.lipr_predet = 'S' AND U.user_cod = USER AND ((L.sucu_id = U.sucu_id) or (U.sucu_id = 0) or (L.sucu_id = 0)) INTO :LISTA;
    select FIRST 1 a.auto_numero from autorizaciones a
        where a.pref_pre = :pref and a.tido_cod = 31 and a.auto_fecha <= :fecha and a.auto_vence >= :fecha
        AND CAST(a.auto_inicial AS BIGINT) <= CAST(:numero AS BIGINT)
        AND CAST(a.auto_final AS BIGINT) >= CAST(:numero AS BIGINT) into :autorizacion;
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
                          FACT_DIAIVA, FACT_FORMAP, FACT_FECHADIAN, FACT_CONTADO, FACT_PROFORMA, FACT_UUID, FACT_IMPBA, FACT_IMPUP)
    values (:iddoc, :ptovta, :vend, :NIT, :autorizacion, '00000001', :fecha, NULL,
            :VENCE, :ivainc, 0, 0, :dtoporc, :dtomonto,
            :adicional, :ivatot, :rtfteporc, (:BASE * :rtfteporc / 100), :rtivaporc, (:ivatot * :rtivaporc / 100),
            :rticaporc, (:BASE * :rticaporc / 1000), :extra, :dtofporc, (:BASE * :dtofporc / 100), :dtoffec,
            :pref, NULL, :nomterc, NULL, IIF(:tiporef = 34, :NUMREF, NULL), IIF(:tiporef = 32, :NUMREF, NULL), 'N',
            'N', :TOTAL, :bodega, :OBS, NULL, :idc, 0,
            USER, :sucursal, 'N', :vend, 1, 'N', NULL,
            0, 0, 0, 1, 0, NULL, NULL,
            NULL, NULL, 0, 0, 0, NULL, :nomterc,
            NULL, NULL, 'N', NULL, 1, NULL, NULL,
            NULL, NULL, NULL, NULL, 1, NULL, NULL,
            'N', NULL, :BASE, NULL, NULL, 0, NULL,
            NULL, NULL, NULL, 0, NULL, 'S', 'N',
            'N', :FORMAP, NULL, :contado, NULL, NULL, :impba, :impup);

    for select DIWD_ITEM, DIWD_ARTICULO, DIWD_DESCART, DIWD_CODBAR, DIWD_CANT, DIWD_UNIDAD, DIWD_COSTO, DIWD_IVAPORC, DIWD_TIVA, DIWD_IVAMONTO,
        D.diwd_dtoporc, DIWD_LOTE, DIWD_VENCELOTE, DIWD_REF, DIWD_OBS, DIWD_LISTA, D.diwd_inalcm, D.diwd_inalcp, D.diwd_impupp, D.diwd_impupm, D.diwd_impba
        from DOC_INVENTARIO_DET_WEB D WHERE DINW_ID = :ID
        into :ITEM, :ARTICULO, :descripcion, :CODBAR, :CANT, :UNIDAD, :COSTO, :IVAPORC, :TIVA, :ivamonto, :dtoporc, :LOTE, :VENCELOTE,
        :REFITE, :OBSITE, :LISTA, :impinc, :impincp, :impupporc, :impup, :impba

        DO
        BEGIN
        TOTAL = (COSTO - (COSTO * (COALESCE(DTOPORC, 0) / 100))) * CANT;
        SELECT ARTI_CONSUMO, TAIV_COD, ARTI_DES, ARTI_DESVAR FROM ARTICULO A WHERE ARTI_COD = :articulo INTO :consumo, :TIVA, :descriparti, :DESVAR;

        /* Descripcion variable */
        IF (DESVAR = 'N') THEN
        BEGIN
        descripcion = descriparti;
        END

        EXECUTE PROCEDURE factor_unidad_cant(:articulo, :unidad) returning_values (factor);
        if (IVAINC = 'N') then
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
                :TIVA, :impincp, :impinc, NULL, 0, NULL,
                0, 0, 'N', NULL, :impupporc, :impup, :impba);
        END
    UPDATE doc_inventario_web D SET D.dinw_iddoc = :iddoc WHERE D.dinw_id = :ID;
    SELECT PREF_PRE || FACT_NUMERO FROM FACTURAS WHERE FACT_ID = :iddoc INTO :numdoc;

    select a.auto_contado from autorizaciones a, facturas f where a.pref_pre = f.pref_pre and a.auto_numero = f.auto_numero and f.fact_id = :iddoc into :contado;
    if (contado = 'S') then
        begin
        /* grabe el recibo */
        SELECT FIRST 1 CAJA_ID FROM punto_venta WHERE PTVT_ID = :PTOVTA INTO :CAJA;
        if (CAJA is null) then SELECT FIRST 1 CAJA_ID FROM cajas INTO :CAJA;
        if (CAJA is null) then CAJA = 1;
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
        end

    NERROR = 0;
    select max(inve_id) from interfaz_ventas where tido_cod = 31 and pref_pre = :pref into :idinter;
    execute procedure contabil_factura(:IDDOC, :IDINTER, 0) returning_values (:NERROR, :VER, :IDC);
    if (NERROR = 0) then
        execute procedure CONTABILIZA_PENDIENTE(:IDC);
    suspend;
    END

end