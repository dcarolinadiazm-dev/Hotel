create or alter procedure GRABE_FACTURA_WEB (
    ID integer)
returns (
    IDFAC integer,
    NUMFAC varchar(12),
    NERROR integer)
as
declare variable IVAINC char(1);
declare variable PUNTO integer;
declare variable BOD varchar(2);
declare variable CAJA integer;
declare variable FORMAP integer;
declare variable CODBCO varchar(2);
declare variable CTABCO varchar(20);
declare variable NUMBCO varchar(20);
declare variable TOTAL numeric(18,2);
declare variable FECHA date;
declare variable CONTADO char(1);
begin
select facw_idfac, facw_formap, FACW_FECHA, FACW_TOTAL from factura_web where facw_id = :id
    into :idfac, :formap, :FECHA, :TOTAL;
if ((idfac = 0) or (idfac is null))  then
    begin
    IDFAC = gen_id(id_factura, 1);
    NERROR = 0;
    SELECT PREF_IVAINC FROM PREFIJOS P, FACTURA_WEB F
        WHERE TIDO_COD = 31 AND PREF_PRE = F.facw_pref AND F.facw_id = :ID INTO :IVAINC;
    SELECT FACW_PUNTO FROM FACTURA_WEB where facw_id = :ID into :punto;
    if (punto IS null ) then
    begin
    SELECT PTVT_ID FROM VENDEDORES V, FACTURA_WEB F WHERE F.facw_id = :ID AND V.vend_cod = F.vend_cod INTO :PUNTO;
    end
    SELECT BODE_COD, CAJA_ID FROM punto_venta WHERE PTVT_ID = :PUNTO INTO :BOD, :CAJA;
    /* EL ENCABEZADO */
    
    INSERT INTO FACTURAS (FACT_ID, PTVT_ID, VEND_COD, TERC_NIT, FACT_NUMERO, FACT_FECHA, FACT_DESPACHO, FACT_VENCE,
        FACT_IVAINC, FACT_COMIPORC, FACT_COMIMONTO, FACT_DTOPOR, FACT_DTOMONTO, FACT_ADICIONAL, FACT_IVAMONTO, FACT_RTFTEPOR,
        FACT_RTFTEMONTO, FACT_RTIVAPOR, FACT_RTIVAMONTO, FACT_RTICAPOR, FACT_RTICAMONTO, FACT_EXTRA, FACT_DTOFPOR, FACT_DTOFMONTO,
        FACT_DTOFFECHA, PREF_PRE, FACT_TRANSP, FACT_NOMCLIENTE, FACT_COTIZACI, FACT_PEDIDO, FACT_REMISION, FACT_ANULADO, FACT_TRANSMIT,
        FACT_TOTAL, BODE_COD, FACT_OBS, VEHI_COD, FACT_CONSOLIDA, FACT_RECIBIDO, FACT_USUARIO, FACT_SUCURSAL, NUMOK, COBR_COD,
        FACT_FACTOR, FACT_DETCLI, FACT_DETCLINOM, FACT_DTOIT1, FACT_DTOIT2, FACT_DTOIT3, FACT_TRM, FACT_ANTICIPO, FACT_DEC2799,
        FACT_RTCREE, FACT_RTCREEM, FACT_ENTREGA, FACT_ENVFEL, FACT_FORMAP, FACT_CUFE)
        SELECT :idfac, :PUNTO, VEND_COD, TERC_NIT, '000001', FACW_FECHA , '', FACW_FECHA,
        :IVAINC, 0, 0, FACW_DTOPORC, FACW_DTOMONTO, FACW_ADICIONAL, FACW_IVAMONTO, FACW_RTFTEPORC,
        FACW_RTFTEMONTO, FACW_RTIVAPORC, FACW_RTIVAMONTO, FACW_RTICAPORC, FACW_RTICAMONTO, FACW_EXTRA, 0, 0,
        FACW_FECHA, FACW_PREF, NULL, FACW_NOMBRE, NULL, NULL, NULL, 'N', 'N',
        FACW_TOTAL, :BOD, FACW_OBS, NULL, 0, 0, USER, FACW_SUCURSAL, 'N', VEND_COD,
        1, NULL, NULL, 0, 0, 0, 1, 0, 0, 0, 0, FACW_ENTREGA, 'N', facw_formap, FACW_CUFE
        FROM FACTURA_WEB WHERE FACW_ID = :ID;
    /* LOS ITEMS */
    
    INSERT INTO FACTURAS_DETALLE (FACT_ID, FADE_ITEM, BODE_COD, ARTI_COD, FADE_CANT, FADE_UNIDAD, FADE_LOTE, FADE_PRUNIT, FADE_DTOPORC,
        FADE_DTOMONTO, FADE_IVAPORC, FADE_IVAMONTO, FADE_CONSUMO, FADE_FACTOR, FADE_DESC, FADE_OBS, FADE_CODBAR,
        FADE_REMISIONADO, FADE_DEVUELTO, FADE_TOTAL, LIPR_COD, FADE_REFERENCIA, FADE_ANULADO, FADE_TRANSMIT, FADE_FACTORLISTA,
        FADE_DTO1, FADE_DTO2, FADE_DTO3, FADE_DTOM1, FADE_DTOM2, FADE_DTOM3, FADE_CAJAS, FADE_BASE, FADE_PORCBASE, FADE_INALCP,
        FADE_INALCM)
        SELECT :idfac, FAWD_ITEM, BODE_COD, ARTI_COD, FAWD_CANT, FAWD_UNIDAD, null, FAWD_PRUNIT, FAWD_DTOP,
        FAWD_DTOM, FAWD_IVAP, FAWD_IVAMONTO, FAWD_CONSUMO, NULL, FAWD_DESC, FAWD_OBS, FAWD_CODBAR,
        0, 0, FAWD_TOTAL, LIPR_COD, FAWD_REFERENCIA, 'N', 'N', 1,
        FAWD_DTO1, FAWD_DTO2, FAWD_DTO3, FAWD_DTO1M, FAWD_DTO2M, FAWD_DTO3M, 0, 0, 0, FAWD_INALCP, FAWD_INALCM
        FROM FACTURA_WEB_DETALLE WHERE FACW_ID = :ID;
    select a.auto_contado from autorizaciones a, facturas f where a.pref_pre = f.pref_pre and a.auto_numero = f.auto_numero and f.fact_id = :idfac into :contado;
    if (contado = 'S') then
        begin
        /* grabe el recibo */
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
        insert into FACTURAS_CONTADO_PAGO (FCNT_ID, FCNP_ITEM, FOPA_ID, FCNP_BANCO, FCNP_CUENTA, FCNP_NUMERO, FCNP_FECHA, FCNP_MONTO, FCNP_ANULADO, FCNP_CERRADO, CAJA_ID)
            values (:idfac, 1, :formap, :codbco, :ctabco, :numbco, :FECHA, :total, 'N', 'N', :caja);
        end
    SELECT PREF_PRE || FACT_NUMERO FROM FACTURAS WHERE FACT_ID = :IDFAC INTO :NUMFAC;
    update factura_web set facw_idfac = :idfac where facw_id = :id;
    suspend;
    end
else
    begin
    idfac = 0;
    NERROR = 1;
    NUMFAC = '0';
    suspend;
    end
end