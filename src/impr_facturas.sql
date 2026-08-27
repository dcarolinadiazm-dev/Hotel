create or alter procedure IMPR_FACTURA (
    ID integer,
    MONEDAEX char(1))
returns (
    PREF varchar(4),
    NUMERO varchar(8),
    MONEDA varchar(60),
    TRM numeric(18,4),
    FECHA date,
    VENCE date,
    DIASVENCE integer,
    CONTCRED char(17),
    NIT varchar(20),
    NOMTERCERO varchar(60),
    NOMCLIENTE varchar(60),
    VENDEDOR integer,
    NOMVENDEDOR varchar(60),
    PUNTOVTA integer,
    NOMPUNTOVTA varchar(60),
    CODBODEGA varchar(2),
    NOMBODEGA varchar(30),
    FORMAP varchar(30),
    AUTORIZACION varchar(20),
    DESPACHO varchar(255),
    TRANSPORTADOR varchar(60),
    COTIZACION varchar(30),
    PEDIDO varchar(30),
    REMISION varchar(30),
    CONVENIO varchar(60),
    PACIENTE varchar(20),
    NOMPACIENTE varchar(60),
    DIRPACIENTE varchar(100),
    CIUPACIENTE varchar(60),
    TELPACIENTE varchar(40),
    TRPACIENTE varchar(60),
    COMIPORC numeric(9,2),
    COMIMONTO numeric(18,2),
    SUBTOTAL numeric(18,2),
    INGTERCEROS numeric(18,2),
    INGPROPIOS numeric(18,2),
    DTOPORC numeric(9,2),
    DTOMONTO numeric(18,2),
    ADICIONAL numeric(18,2),
    IVAMONTO numeric(18,2),
    TOTIMPBA numeric(18,2),
    TOTIMPUP numeric(18,2),
    DEC2799 numeric(18,2),
    RTEFTEPORC numeric(9,4),
    RTEFTEMONTO numeric(18,2),
    RTEIVAPORC numeric(9,2),
    RTEIVAMONTO numeric(18,2),
    RTEICAPORC numeric(9,4),
    RTEICAMONTO numeric(18,2),
    RTECREEP numeric(9,2),
    RTECREEM numeric(18,2),
    EXTRA numeric(18,2),
    DTOFPORC numeric(9,2),
    DTOFMONTO numeric(18,2),
    FECHADTO date,
    DTOF1P numeric(9,2),
    DTOF1M numeric(18,2),
    DTOF1F date,
    DTOF2P numeric(9,2),
    DTOF2M numeric(18,2),
    DTOF2F date,
    DTOF3P numeric(9,2),
    DTOF3M numeric(18,2),
    DTOF3F date,
    ANTICIPO numeric(18,2),
    RETGARANTIA numeric(18,2),
    AIUADMON numeric(18,2),
    AIUIMPRE numeric(18,2),
    AIUUTIL numeric(18,2),
    TOTALFAC numeric(18,2),
    TOTALPAGAR numeric(18,2),
    TOTALNETO numeric(18,2),
    ENTREGA date,
    OBS blob sub_type 1 segment size 80,
    NUMITEMS integer,
    PAGTOTAL integer,
    ITEM integer,
    ARTICULO varchar(15),
    CODBAR varchar(60),
    ARTIDES varchar(300),
    DESCORTA varchar(30),
    CANT numeric(18,4),
    LOTE varchar(50),
    VLOTE date,
    SERIALES varchar(4096),
    UNIDAD varchar(8),
    CAJAS numeric(18,4),
    FACTOR numeric(18,4),
    LISTAPR integer,
    REFITEM varchar(60),
    BODITEM varchar(2),
    STAND varchar(20),
    MANDANTE varchar(20),
    PRUNIT numeric(18,2),
    PRSINIVA numeric(18,4),
    DTOITPORC numeric(9,2),
    DTOITMONTO numeric(18,2),
    PRECIOREF numeric(18,2),
    PRNETO numeric(18,2),
    PRNETOSINIVA numeric(18,2),
    BASE numeric(18,2),
    PORCBASE numeric(9,2),
    DTOIT1 numeric(9,2),
    DTOIT2 numeric(9,2),
    DTOIT3 numeric(9,2),
    IVAPORC numeric(9,2),
    IVAITMONTO numeric(18,2),
    CONSUMO numeric(18,2),
    IMPBOLSA numeric(18,2),
    INALCP numeric(18,2),
    INALC numeric(18,2),
    ITIMPBA numeric(18,2),
    ITIMPBAU numeric(18,2),
    ITIMPBAC numeric(18,2),
    ITIMPUPP numeric(9,2),
    ITIMPUPM numeric(18,2),
    SUBTOTIT numeric(18,2),
    IDORI integer,
    TOTAL numeric(18,2),
    PESOTOT numeric(18,2),
    CODIGOCL varchar(20),
    ZONACOD varchar(2),
    ZONANOM varchar(60),
    DV char(1),
    DIRECCION varchar(60),
    CIUDAD varchar(40),
    TELEFONO varchar(40),
    CONTACTO varchar(255),
    FAX varchar(25),
    CEL varchar(25),
    GRUPO varchar(2),
    NOMGRUPO varchar(30),
    SUBGRUPO varchar(3),
    NOMSUBG varchar(30),
    MARCA varchar(3),
    NOMMARCA varchar(30),
    FABR varchar(3),
    NOMFABR varchar(60),
    PESO numeric(18,4),
    ANCHO numeric(18,4),
    ALTO numeric(18,4),
    LARGO numeric(18,4),
    SUMA0 numeric(18,2),
    SUMA1 numeric(18,2),
    SUMA2 numeric(18,2),
    SUMA3 numeric(18,2),
    SUMA4 numeric(18,2),
    SUMA5 numeric(18,2),
    SUMA6 numeric(18,2),
    SUMA7 numeric(18,2),
    SUMA8 numeric(18,2),
    SUMA9 numeric(18,2),
    SUMA10 numeric(18,2),
    SUMA11 numeric(18,2),
    SUMA12 numeric(18,2),
    SUMA13 numeric(18,2),
    SUMA14 numeric(18,2),
    IVA0 numeric(18,2),
    IVA1 numeric(18,2),
    IVA2 numeric(18,2),
    IVA3 numeric(18,2),
    IVA4 numeric(18,2),
    IVA5 numeric(18,2),
    IVA6 numeric(18,2),
    IVA7 numeric(18,2),
    IVA8 numeric(18,2),
    IVA9 numeric(18,2),
    IVA10 numeric(18,2),
    IVA11 numeric(18,2),
    IVA12 numeric(18,2),
    IVA13 numeric(18,2),
    IVA14 numeric(18,2),
    TARIFA integer,
    SUMAEX numeric(18,2),
    SUMAGR numeric(18,2),
    SUMAINALC numeric(18,2),
    TOTCONSUMO numeric(18,2),
    TOTIMPBOLSA numeric(18,2),
    TOTINALC numeric(18,2),
    DTOIT1M numeric(18,2),
    DTOIT2M numeric(18,2),
    DTOIT3M numeric(18,2),
    DTOITEM1 numeric(18,2),
    DTOITEM2 numeric(18,2),
    DTOITEM3 numeric(18,2),
    AHORRO numeric(18,2),
    TOTCAJAS numeric(18,2),
    TOTBASE numeric(18,2),
    TOTAHORRO numeric(18,2),
    VEHICULO varchar(8),
    RECIBIDO numeric(18,2),
    CAMBIO numeric(18,2),
    HORA time,
    FORMAPAGO1 varchar(30),
    MONTOPAGO1 numeric(18,2),
    MONTOPAGOE1 numeric(18,2),
    FORMAPAGO2 varchar(30),
    MONTOPAGO2 numeric(18,2),
    MONTOPAGOE2 numeric(18,2),
    FORMAPAGO3 varchar(30),
    MONTOPAGO3 numeric(18,2),
    MONTOPAGOE3 numeric(18,2),
    FORMAPAGO4 varchar(30),
    MONTOPAGO4 numeric(18,2),
    MONTOPAGOE4 numeric(18,2),
    FORMAPAGO5 varchar(30),
    MONTOPAGO5 numeric(18,2),
    MONTOPAGOE5 numeric(18,2),
    FORMAPAGO6 varchar(30),
    MONTOPAGO6 numeric(18,2),
    MONTOPAGOE6 numeric(18,2),
    PUNTOS integer,
    PUNTOSACUM integer,
    PUNTOSVENC integer,
    FECPTOS date,
    CREDITO numeric(18,2),
    OBSITEM blob sub_type 1 segment size 80,
    SUCUR varchar(10),
    ALTERNATIVAS numeric(18,4),
    PRINCIPALES numeric(18,4),
    UNIALTERNA varchar(8),
    FECINI date,
    FECFIN date,
    CARTINI numeric(18,2),
    CARTFIN numeric(18,2),
    ABONOS numeric(18,2),
    CARGOS numeric(18,2),
    CODRECAUDO varchar(65),
    CODRECAUDOR varchar(65),
    VALE varchar(60),
    FACMAR varchar(60),
    TOTDESCITEM numeric(18,2),
    SUMDTOS numeric(18,2),
    CUFE varchar(100),
    LLEVAR varchar(1),
    NOMVENDREM varchar(60),
    CUMPLE char(1),
    COMPRA1 char(1),
    UNDRESALTAR char(1))
as
--declare variable TRM double precision;
declare variable TRMRDC double precision;
declare variable IMPTOS char(1);
declare variable ITEMFOR integer;
declare variable DEVUELTO numeric(18,4);
declare variable ORDENCOD char(15);
declare variable IMPRDEV char(2);
declare variable IMPRENS char(2);
declare variable IMPR char(1);
declare variable ITEMFP integer;
declare variable FORMAPAGO varchar(30);
declare variable MONTOP numeric(18,2);
declare variable ICOINC char(2);
declare variable DTOITE3 char(2);
declare variable SUMDTOIT numeric(18,2);
declare variable AUTORET varchar(10);
declare variable FAUTORET date;
declare variable AUTORCREE varchar(10);
declare variable FAUTORCREE date;
declare variable AUTORICA varchar(10);
declare variable FAUTORICA date;
declare variable CLIAUTORICA char(1);
declare variable FACTCANT numeric(18,4);
declare variable ANULADO char(1);
declare variable INGTER char(2);
declare variable FACTENC double precision;
declare variable CODGS1 varchar(13);
declare variable STRVALOR varchar(11);
declare variable AUXVALOR varchar(15);
declare variable NITCONTADO varchar(20);
declare variable DVDIAN char(1);
declare variable CEROSIZQ char(2);
declare variable IDFMAR integer;
declare variable NUMFAC varchar(12);
declare variable CANTENS numeric(18,4);
declare variable CANTOT char(2);
declare variable OMITEREP char(2);
declare variable CODANTERIOR varchar(15);
declare variable DIASOSALDO varchar(20);
declare variable I integer;
declare variable UNDPPAL varchar(8);
declare variable PRMAX numeric(18,2);
declare variable PRREF char(2);
declare variable DESAUX varchar(300);
declare variable ARTBOLSA varchar(15);
declare variable ARTAIUA varchar(15);
declare variable ARTAIUI varchar(15);
declare variable ARTAIUU varchar(15);
declare variable MONEX char(1);
declare variable TIPOFE integer;
declare variable PROVTEC varchar(20);
declare variable AUTOCONT char(1);
BEGIN
i = 0;
execute procedure lee_configuracion('FACTURACION', 'FACTURAS', 'OMITIR CODIGO Y DESCRIPCION EN ITEMS CONSECUTIVOS CON EL MISMO ARTICULO') returning_values (OMITEREP);
execute procedure lee_configuracion('FACTURACION', 'DOCUMENTOS', 'IMPRIMIR REPORTES DE COMPROBANTES Y CONSECUTIVOS CON CEROS A LA IZQUIERDA') returning_values (CEROSIZQ);
execute procedure lee_configuracion('FACTURACION', 'ARTICULOS', 'IMPOCONSUMO INCLUIDO EN EL PRECIO BASE DE VENTA ANTES DE IVA') returning_values (icoinc);
execute procedure lee_configuracion('FACTURACION', 'FACTURAS', 'COLUMNAS DE DESCUENTO POR ITEM ADICIONALES') returning_values (DTOITE3);
execute procedure lee_configuracion('FACTURACION', 'FACTURAS', 'GRUPO DE MERCANCIA PARA INGRESOS DE TERCEROS') returning_values (INGTER);
EXECUTE PROCEDURE LEE_CONFIGURACION('INVENTARIO', 'ENSAMBLES', 'FORMACIONES CON CANTIDADES TOTALES') returning_values (:CANTOT);
EXECUTE PROCEDURE LEE_CONFIGURACION('FACTURACION', 'FACTURAS', 'MOSTRAR PRECIO DE REFERENCIA EN FACTURAS') returning_values (:PRREF);
SELECT F.PREF_PRE, FACT_NUMERO, FACT_FECHA, FACT_VENCE, F.BODE_COD, BODE_NOM, F.TERC_NIT, FACT_NOMCLIENTE, F.VEND_COD, VEND_NOMBRE, F.PTVT_ID, PTVT_NOM,
    AUTO_NUMERO, FACT_DESPACHO, FACT_TRANSP, FACT_COTIZACI, FACT_PEDIDO, FACT_REMISION, FACT_COMIPORC, FACT_COMIMONTO, FACT_IVAINC, FACT_CUFE, FACT_CONVCART,
    FACT_DTOPOR, FACT_DTOMONTO, FACT_ADICIONAL, FACT_IVAMONTO, FACT_RTFTEPOR, FACT_RTFTEMONTO, FACT_RTIVAPOR, FACT_RTIVAMONTO, FACT_CUMPLEANOS, FACT_1ACOMPRA,
    FACT_RTICAPOR, FACT_RTICAMONTO, FACT_RTCREE, FACT_RTCREEM, FACT_EXTRA, FACT_DTOFPOR, FACT_DTOFMONTO, FACT_DTOFFECHA, FACT_TOTAL, FACT_TRM, FACT_MONEDA, 
    TERC_DIR, TERC_CIU, TERC_TEL, TERC_CONTACTO, TERC_FAX, TERC_DV, TERC_CEL, FACT_DTOIT1, FACT_DTOIT2, FACT_DTOIT3, FACT_DEC2799, FACT_ENTREGA,
    FACT_OBS, VEHI_COD, /*FACT_NROCOPIA,*/ FACT_RECIBIDO, FACT_SUCURSAL, FACT_DETCLI, FACT_DETCLINOM, TERC_NOM, FACT_ANULADO, FACT_ANTICIPO, FACT_FORMAP,
    FACT_GARANTIA, FACT_FACTOR, FACT_FECINI, FACT_FECFIN, p.terc_nit, FACT_DETCLIDIR, FACT_DETCLICIU, FACT_DETCLITEL, FACT_DETCLITR, FACT_VALE, FACT_IDFMAR,
    FACT_DTOF1, FACT_DTOF1M, FACT_DTOF1FEC, FACT_DTOF2, FACT_DTOF2M, FACT_DTOF2FEC, FACT_DTOF3, FACT_DTOF3M, FACT_DTOF3FEC, (FACT_DTOIT1+FACT_DTOIT2+FACT_DTOIT3),
    FACT_TIPOFE, f.fact_impba, F.fact_impup
    FROM FACTURAS F, BODEGA B, VENDEDORES V, PUNTO_VENTA P, TERCEROS T
    WHERE F.BODE_COD = B.BODE_COD AND F.VEND_COD = V.VEND_COD AND F.PTVT_ID = P.PTVT_ID AND F.TERC_NIT = T.TERC_NIT AND F.FACT_ID = :ID
    into :PREF, :NUMERO, :FECHA, :VENCE, :CODBODEGA, :NOMBODEGA, :NIT, :NOMTERCERO, :VENDEDOR, :NOMVENDEDOR, :PUNTOVTA, :NOMPUNTOVTA,
    :AUTORIZACION, :DESPACHO, :TRANSPORTADOR, :COTIZACION, :PEDIDO, :REMISION, :COMIPORC, :COMIMONTO, :IMPTOS, :cufe, :convenio,
    :DTOPORC, :DTOMONTO, :ADICIONAL, :IVAMONTO, :RTEFTEPORC, :RTEFTEMONTO, :RTEIVAPORC, :RTEIVAMONTO, :CUMPLE, :COMPRA1,
    :RTEICAPORC, :RTEICAMONTO, :rtecreep, :rtecreem, :EXTRA, :DTOFPORC, :DTOFMONTO, :FECHADTO, :TOTALFAC, :TRM, :MONEDA,
    :DIRECCION, :CIUDAD, :TELEFONO, :CONTACTO, :FAX, :DV, :CEL, :dtoit1m, :dtoit2m, :dtoit3m, :dec2799, :ENTREGA,
    :OBS, :VEHICULO,/* :NROCOPIA,*/ :RECIBIDO, :SUCUR, :paciente, :nompaciente, :nomcliente, :ANULADO, :anticipo, :formap,
    :retgarantia, :factenc, :FECINI, :FECFIN, :NITCONTADO, :DIRPACIENTE, :CIUPACIENTE, :TELPACIENTE, :TRPACIENTE, :VALE, :IDFMAR,
    :dtof1p, :dtof1m, :dtof1f, :dtof2p, :dtof2m, :dtof2f, :dtof3p, :dtof3m, :dtof3f, :sumdtos, :tipofe, :totimpba, :totimpup;
select a.auto_archfe, a.auto_contado from autorizaciones a where a.tido_cod = 31 and a.pref_pre = :pref and a.auto_inicial <= :numero and a.auto_final >= :numero
    into :provtec, :AUTOCONT;
if ((PROVTEC = 'DATAICO') OR (PROVTEC = 'FACTURATECH') or (PROVTEC = 'DIANSYSPLUS')) then
    begin
    execute procedure nombre_ascii(:nomtercero) returning_values(:nomtercero);
    execute procedure nombre_ascii(:nomcliente) returning_values(:nomcliente);
    execute procedure nombre_ascii(:NOMVENDEDOR) returning_values(:NOMVENDEDOR);
    end
SELECT FOPA_NOM FROM formas_pago WHERE FOPA_ID = :FORMAP INTO :FORMAP;
if (CEROSIZQ = 'NO') then
    NUMERO = CAST(CAST(NUMERO AS INTEGER) AS VARCHAR(8));
/* ACUMULE LOS PUNTOS, SE HACE ACA POR SER POSTERIOR AL DETALLE */
if (ANULADO = 'N') then
    EXECUTE PROCEDURE acumula_puntos_cliente (31, :id, :nit, :fecha) returning_values (:PUNTOS);
EXECUTE PROCEDURE consulta_puntos_cliente (:id, :nit, :fecha) returning_values (:puntos, :puntosacum, :puntosvenc, :fecptos);
if (DTOIT1M IS NULL) then
    DTOIT1M = 0;
if (DTOIT2M IS NULL) then
    DTOIT2M = 0;
if (DTOIT3M IS NULL) then
    DTOIT3M = 0;
EXECUTE PROCEDURE LEE_CONFIGURACION('FACTURACION','ARTICULOS','SEPARAR ARTICULOS SEGUN LA MARCA EN FACTURAS INDEPENDIENTES') RETURNING_VALUES (FACMAR);
if (FACMAR = 'SI') then
    BEGIN
    FACMAR = '';
    if ((idfmar IS NOT NULL) AND (IDFMAR <> 0)) then
        BEGIN
        SELECT PREF_PRE || FACT_NUMERO || '-' FROM FACTURAS WHERE FACT_ID = :IDFMAR INTO :FACMAR;
        END
    FOR SELECT PREF_PRE || FACT_NUMERO FROM FACTURAS WHERE FACT_IDFMAR = :IDFMAR AND FACT_NUMERO <> :numero AND PREF_PRE <> :pref
        INTO :NUMFAC
        DO
        BEGIN
        FACMAR = FACMAR || :NUMFAC || '-';
        END
    END
ELSE
    FACMAR = '';
SELECT CLIE_COD, C.ZONA_COD FROM CLIENTES C
    WHERE TERC_NIT = :NIT INTO :CODIGOCL, :ZONACOD;
SELECT CLSU_DIR, CLSU_CIUDAD, CLSU_TEL, ZONA_COD FROM CLIENTE_SUCURSALES WHERE TERC_NIT = :NIT AND CLCU_COD = :SUCUR
    INTO :DIRECCION, :CIUDAD, :TELEFONO, :ZONACOD;
if ((PROVTEC = 'DATAICO') OR (PROVTEC = 'FACTURATECH') or (PROVTEC = 'DIANSYSPLUS')) then
    execute procedure nombre_ascii(:ciudad) returning_values(:ciudad);
ZONANOM = '';
SELECT ZONA_NOM FROM ZONAS Z WHERE ZONA_COD = :zonacod INTO :ZONANOM;
DIASVENCE = VENCE - FECHA;
if (DIASVENCE > 0) then
    CONTCRED = 'CREDITO ' || CAST(DIASVENCE AS VARCHAR(3)) || ' DIAS';
ELSE
    CONTCRED = 'CONTADO';
SUBTOTAL = TOTALFAC - EXTRA - IVAMONTO - ADICIONAL + DTOMONTO + dec2799 - totimpba - totimpup;
SELECT SUM(FADE_DTOMONTO*FADE_CANT) FROM FACTURAS_DETALLE WHERE FACT_ID = :id INTO :sumdtoit;
-- FACTTOOL
--if (DTOITE3 = 'SI') then
--    BEGIN
--    SUBTOTAL = SUBTOTAL + sumdtoit + dtoit1m + dtoit2m + dtoit3m;
--    END
if (INGTER <> '') then
    BEGIN
    SELECT SUM(FADE_TOTAL) FROM FACTURAS_DETALLE D, ARTICULO A WHERE A.arti_cod = D.arti_cod AND FACT_ID = :id AND GRUP_COD = :ingter
        INTO :ingterceros;
    INGPROPIOS = SUBTOTAL - INGTERCEROS;
    END
if (TIPOFE = 9) then
    BEGIN
    EXECUTE PROCEDURE LEE_CONFIGURACION('FACTURACION', 'FACTURAS', 'CODIGO PARA FACTURAR LA ADMINISTRACION EN FACTURAS AIU') returning_values (ARTAIUA);
    SELECT FADE_TOTAL-FADE_IVAMONTO FROM FACTURAS_DETALLE FD WHERE FD.fact_id = :id AND FD.arti_cod = :ARTAIUA INTO :aiuadmon;
    EXECUTE PROCEDURE LEE_CONFIGURACION('FACTURACION', 'FACTURAS', 'CODIGO PARA FACTURAR LOS IMPREVISTOS EN FACTURAS AIU') returning_values (ARTAIUI);
    SELECT FADE_TOTAL-FADE_IVAMONTO FROM FACTURAS_DETALLE FD WHERE FD.fact_id = :id AND FD.arti_cod = :ARTAIUI INTO :aiuimpre;
    EXECUTE PROCEDURE LEE_CONFIGURACION('FACTURACION', 'FACTURAS', 'CODIGO PARA FACTURAR LA UTILIDAD EN FACTURAS AIU') returning_values (ARTAIUU);
    SELECT FADE_TOTAL-FADE_IVAMONTO FROM FACTURAS_DETALLE FD WHERE FD.fact_id = :id AND FD.arti_cod = :ARTAIUU INTO :aiuutil;
    if (AIUADMON IS NULL) then
        AIUADMON = 0;
    if (aiuimpre IS NULL) then
        aiuimpre = 0;
    if (aiuutil IS NULL) then
        aiuutil = 0;
    SUBTOTAL = SUBTOTAL - aiuadmon - aiuimpre - aiuutil;
    END
EXECUTE PROCEDURE LEE_CONFIGURACION('CARTERA', 'SALDOS', 'FECHA AUTORETENEDOR NO DESCONTAR RETENCIONES DEL SALDO PERO SI CONTABILIZARLAS') returning_values (AUTORET);
if (AUTORET <> '') then
    FAUTORET = CAST(AUTORET AS DATE);
else
    FAUTORET = '9999/12/31';
EXECUTE PROCEDURE LEE_CONFIGURACION('CARTERA', 'SALDOS', 'FECHA AUTORETENEDOR DE RETENCION CREE') returning_values (AUTORCREE);
if (AUTORCREE <> '') then
    FAUTORCREE = CAST(AUTORCREE AS DATE);
else
    FAUTORCREE = '9999/12/31';
EXECUTE PROCEDURE LEE_CONFIGURACION('CARTERA', 'SALDOS', 'FECHA AUTORETENEDOR DE ICA') returning_values (AUTORICA);
if (AUTORICA <> '') then
    FAUTORICA = CAST(AUTORICA AS DATE);
else
    FAUTORICA = '9999/12/31';
SELECT CLIE_AUTORETICA FROM CLIENTES C WHERE TERC_NIT = :NIT INTO :CLIAUTORICA;
if (CLIAUTORICA = 'S') then
    FAUTORICA = '9999/12/31';
if (FECHA > fautoret) then
    if (FECHA >= fautorcree) then
        if (FECHA >= fautorica) then
            TOTALPAGAR = TOTALFAC - RTEIVAMONTO - ANTICIPO - RETGARANTIA;
        else
            TOTALPAGAR = TOTALFAC - RTEIVAMONTO - RTEICAMONTO - ANTICIPO - RETGARANTIA;
    else
        TOTALPAGAR = TOTALFAC - RTEIVAMONTO - RTEICAMONTO - rtecreem - ANTICIPO - RETGARANTIA;
ELSE
    if (FECHA >= fautorcree) then
        if (FECHA >= fautorica) then
            TOTALPAGAR = TOTALFAC - RTEFTEMONTO - RTEIVAMONTO - ANTICIPO - RETGARANTIA;
        else
            TOTALPAGAR = TOTALFAC - RTEFTEMONTO - RTEIVAMONTO - RTEICAMONTO - ANTICIPO - RETGARANTIA;
    else
        if (FECHA >= fautorica) then
            TOTALPAGAR = TOTALFAC - RTEFTEMONTO - rtecreem - RTEIVAMONTO - ANTICIPO - RETGARANTIA;
        else
            TOTALPAGAR = TOTALFAC - RTEFTEMONTO - rtecreem - RTEIVAMONTO - RTEICAMONTO - ANTICIPO - RETGARANTIA;
TOTALNETO = TOTALFAC - ANTICIPO - RETGARANTIA;
if (RECIBIDO <> 0) then
    CAMBIO = RECIBIDO - totalpagar;
ELSE
    CAMBIO = 0;
EXECUTE PROCEDURE LEE_CONFIGURACION('FACTURACION', 'FACTURAS', 'IMPRIMIR CONTADO O CREDITO DEPENDIENDO DE LOS DIAS DE VENCIMIENTO O DEL SALDO DEL DOCUMENTO') returning_values (DIASOSALDO);
if (DIASOSALDO = 'SALDO') then
    BEGIN
    EXECUTE PROCEDURE saldo_doc_cartera(31, :ID, :FECHA, 0) returning_values (:CREDITO);
    if (CREDITO > 0) then
        CONTCRED = 'CREDITO';
    else
        CONTCRED = 'CONTADO';
    END
/* si no hay cotizacion pero hay pedido llame la cotizacion del pedido */
if ((cotizacion is null) or (cotizacion = '')) then
    if ((pedido <> '') AND (STRLEN(:PEDIDO) > 6)) then
        select pedi_cotizaci from pedidos p where pedi_numero = right(:pedido, 6) and pref_pre = left(:pedido,  strlen(:pedido)-6) into :cotizacion;
/* CARTERA Y ABONOS */
if (fecini is null) then
    fecini = fecha;
if (fecfin is null) then
    fecfin = fecha;
if ((NIT <> NITCONTADO) AND (AUTOCONT <> 'S')) then
    BEGIN
    SELECT SUM(SALDO) FROM cartera_cliente(:nit, :fecini-1, :sucur, 0, 'N', 0) INTO :cartini;
    SELECT SUM(SALDO) FROM cartera_cliente(:nit, :fecfin, :sucur, 0, 'N', 0) INTO :cartfin;
    SELECT SUM(M.mvcl_monto) FROM movimiento_clientes M WHERE TERC_NIT = :NIT AND M.mvcl_sucursal = :sucur AND
        M.mvcl_abono = 'S' AND M.mvcl_fecha >= :fecini AND M.mvcl_fecha <= :fecfin INTO :abonos;
    SELECT SUM(M.mvcl_monto) FROM movimiento_clientes M WHERE TERC_NIT = :NIT AND M.mvcl_sucursal = :sucur AND
        M.mvcl_abono = 'N' AND M.mvcl_fecha >= :fecini AND M.mvcl_fecha <= :fecfin INTO :cargos;
    END
if (cartini IS NULL) then
    CARTINI = 0;
if (cartfin IS NULL) then
    cartfin = 0;
if (abonos IS NULL) then
    abonos = 0;
if (cargos IS NULL) then
    cargos = 0;
nitcontado = '';
select t.terc_nitconta, terc_dvdian from terceros t where terc_nit = :nit into :nitcontado, :dvdian;
if ((nitcontado <> '') and (nitcontado is not null) and (nitcontado <> nit)) then
    BEGIN
    nit = nitcontado;
    DV = DVDIAN;
    END
SUMAINALC = 0;
SUMAEX = 0;
SUMA0 = 0;
SUMA1 = 0;
SUMA2 = 0;
SUMA3 = 0;
SUMA4 = 0;
SUMA5 = 0;
SUMA6 = 0;
SUMA7 = 0;
SUMA8 = 0;
SUMA9 = 0;
SUMA10 = 0;
SUMA11 = 0;
SUMA12 = 0;
SUMA13 = 0;
SUMA14 = 0;
IVA0 = 0;
IVA1 = 0;
IVA2 = 0;
IVA3 = 0;
IVA4 = 0;
IVA5 = 0;
IVA6 = 0;
IVA7 = 0;
IVA8 = 0;
IVA9 = 0;
IVA10 = 0;
IVA11 = 0;
IVA12 = 0;
IVA13 = 0;
IVA14 = 0;
TOTCONSUMO = 0;
totimpbolsa = 0;
TOTINALC = 0;
MONTOPAGO1 = 0;
MONTOPAGOE1 = 0;
PESOTOT = 0;
totcajas = 0;
totbase = 0;
SELECT MAX(AUDI_HORA) FROM AUDITORIA WHERE TIDO_COD = 31 AND AUDI_IDDOC = :ID AND AUDI_OPER = 'I' INTO :HORA;
select m.timo_codiso from tipos_moneda m where m.timo_cod = :moneda into :moneda;
/* AHORA LAS FORMAS DE PAGO, BUSQUE EL ABONO DE HOY A LA FACTURA */
ITEMFP = 1;
MONTOPAGO1 = 0;
MONTOPAGO2 = 0;
MONTOPAGO3 = 0;
MONTOPAGOE1 = 0;
MONTOPAGOE2 = 0;
MONTOPAGOE3 = 0;
FOR SELECT FOPA_NOM, FCNP_MONTO, F.fopa_monedaex FROM facturas_contado_pago P, FORMAS_PAGO F
    WHERE P.FOPA_ID = F.FOPA_ID AND p.fcnt_id = :ID
    ORDER BY P.fcnp_item
    INTO :formapago, :MONTOP, :MONEX
    DO
    BEGIN
    if (ITEMFP = 1) then
        BEGIN
        FORMAPAGO1 = FORMAPAGO;
        FORMAP = FORMAPAGO;
        MONTOPAGO1 = MONTOP;
        if (MONEX = 'S') then
            MONTOPAGOE1 = MONTOP / trm;
        else
            MONTOPAGOE1 = 0;
        END
    if (ITEMFP = 2) then
        BEGIN
        FORMAPAGO2 = FORMAPAGO;
        MONTOPAGO2 = MONTOP;
        if (MONEX = 'S') then
            MONTOPAGOE2 = MONTOP / trm;
        else
            MONTOPAGOE2 = 0;
        END
    if (ITEMFP = 3) then
        BEGIN
        FORMAPAGO3 = FORMAPAGO;
        MONTOPAGO3 = MONTOP;
        if (MONEX = 'S') then
            MONTOPAGOE3 = MONTOP / trm;
        else
            MONTOPAGOE3 = 0;
        END
    if (ITEMFP = 4) then
        BEGIN
        FORMAPAGO4 = FORMAPAGO;
        MONTOPAGO4 = MONTOP;
        if (MONEX = 'S') then
            MONTOPAGOE4 = MONTOP / trm;
        else
            MONTOPAGOE4 = 0;
        END
    if (ITEMFP = 5) then
        BEGIN
        FORMAPAGO5 = FORMAPAGO;
        MONTOPAGO5 = MONTOP;
        if (MONEX = 'S') then
            MONTOPAGOE5 = MONTOP / trm;
        else
            MONTOPAGOE5 = 0;
        END
    if (ITEMFP = 6) then
        BEGIN
        FORMAPAGO6 = FORMAPAGO;
        MONTOPAGO6 = MONTOP;
        if (MONEX = 'S') then
            MONTOPAGOE6 = MONTOP / trm;
        else
            MONTOPAGOE6 = 0;
        END
    ITEMFP = ITEMFP + 1;
    END
/* TOTALES DEL DETALLE */
SUMAEX = 0;
SUMAGR = 0;
execute procedure lee_configuracion('FACTURACION', 'POS', 'CODIGO ARTICULO PARA LAS BOLSAS DE EMPAQUE A FACTURAR') returning_values (:ARTBOLSA);
FOR SELECT D.arti_cod, FADE_IVAPORC, FADE_IVAMONTO, FADE_CONSUMO, FADE_TOTAL, FADE_REFERENCIA,
    fade_tiva, FADE_DEVUELTO, FADE_CAJAS, FADE_BASE, FADE_INALCM, FADE_INALCP, fade_impba, fade_impupp, fade_impupm
    FROM FACTURAS_DETALLE D, ARTICULO A
    WHERE D.ARTI_COD = A.ARTI_COD AND D.FACT_ID = :ID
    ORDER BY :ORDENCOD
    INTO :articulo, :IVAPORC, :IVAITMONTO, :CONSUMO, :TOTAL, :refitem,
    :TARIFA, :devuelto, :cajas, :base, :inalc, :inalcp, :itimpba, :itimpupp, :itimpupm
    DO
    BEGIN
    if (ARTBOLSA <> ARTICULO) then
        TOTCONSUMO = TOTCONSUMO + CONSUMO;
    else
        totimpbolsa = totimpbolsa + CONSUMO;
    TOTINALC = TOTINALC + INALC;
    TOTBASE = TOTBASE + BASE;
    if ((REFITEM <> '.t') or (REFITEM IS NULL)) then
        BEGIN
        /* NO SUME LOS ENSAMBLES */
        if ((TARIFA = 0) and (IVAPORC = 0)) then
            SUMAEX = SUMAEX + (TOTAL - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
        if (TARIFA = 0) then
            begin
            SUMA0 = SUMA0 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA0 = IVA0 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 1) then
            BEGIN
            SUMA1 = SUMA1 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA1 = IVA1 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 2) then
            BEGIN
            SUMA2 = SUMA2 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA2 = IVA2 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 3) then
            BEGIN
            SUMA3 = SUMA3 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA3 = IVA3 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 4) then
            BEGIN
            SUMA4 = SUMA4 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA4 = IVA4 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 5) then
            BEGIN
            SUMA5 = SUMA5 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA5 = IVA5 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 6) then
            BEGIN
            SUMA6 = SUMA6 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA6 = IVA6 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 7) then
            BEGIN
            SUMA7 = SUMA7 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA7 = IVA7 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 8) then
            BEGIN
            SUMA8 = SUMA8 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA8 = IVA8 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 9) then
            BEGIN
            SUMA9 = SUMA9 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA9 = IVA9 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 10) then
            BEGIN
            SUMA10 = SUMA10 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA10 = IVA10 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 11) then
            BEGIN
            SUMA11 = SUMA11 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA11 = IVA11 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 12) then
            BEGIN
            SUMA12 = SUMA12 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA12 = IVA12 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 13) then
            BEGIN
            SUMA13 = SUMA13 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA13 = IVA13 + IVAITMONTO*FACTENC;
            END
        if (TARIFA = 14) then
            BEGIN
            SUMA14 = SUMA14 + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            IVA14 = IVA14 + IVAITMONTO*FACTENC;
            END
        if (INALC <> 0) then
            BEGIN
            SUMAINALC = SUMAINALC + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
            SUBTOTAL = subtotal - inalc;
            END
        if (IVAITMONTO <> 0) then
            SUMAGR = SUMAGR + (TOTAL - IVAITMONTO - CONSUMO - INALC - itimpba - itimpupm)*FACTENC;
        END

    if (CAJAS IS NOT NULL) then
        totcajas = totcajas + cajas;
    END
if ((MONEDAEX = 'S') AND (TRM <> 1)) then
    BEGIN
    SUBTOTAL = SUBTOTAL / TRM;
    INGTERCEROS = INGTERCEROS / TRM;
    INGPROPIOS = INGPROPIOS / TRM;
    DTOMONTO = DTOMONTO / TRM;
    ADICIONAL = ADICIONAL / TRM;
    IVAMONTO = IVAMONTO / TRM;
    RTEFTEMONTO = RTEFTEMONTO / TRM;
    RTEIVAMONTO = RTEIVAMONTO / TRM;
    RTEICAMONTO = RTEICAMONTO / TRM;
    RTECREEM = RTECREEM / TRM;
    EXTRA = EXTRA / TRM;
    DTOFMONTO = DTOFMONTO / TRM;
    ANTICIPO = ANTICIPO / TRM;
    RETGARANTIA = RETGARANTIA / TRM;
    TOTALFAC = TOTALFAC / TRM;
    TOTALPAGAR = TOTALPAGAR / TRM;
    TOTALNETO = TOTALNETO / TRM;
    SUMA0 = SUMA0 / TRM;
    SUMA1 = SUMA1 / TRM;
    SUMA2 = SUMA2 / TRM;
    SUMA3 = SUMA3 / TRM;
    SUMA4 = SUMA4 / TRM;
    SUMA5 = SUMA5 / TRM;
    SUMA6 = SUMA6 / TRM;
    SUMA7 = SUMA7 / TRM;
    SUMA8 = SUMA8 / TRM;
    SUMA9 = SUMA9 / TRM;
    SUMA10 = SUMA10 / TRM;
    SUMA11 = SUMA11 / TRM;
    SUMA12 = SUMA12 / TRM;
    SUMA13 = SUMA13 / TRM;
    SUMA14 = SUMA14 / TRM;
    IVA0 = IVA0 / TRM;
    IVA1 = IVA1 / TRM;
    IVA2 = IVA2 / TRM;
    IVA3 = IVA3 / TRM;
    IVA4 = IVA4 / TRM;
    IVA5 = IVA5 / TRM;
    IVA6 = IVA6 / TRM;
    IVA7 = IVA7 / TRM;
    IVA8 = IVA8 / TRM;
    IVA9 = IVA9 / TRM;
    IVA10 = IVA10 / TRM;
    IVA11 = IVA11 / TRM;
    IVA12 = IVA12 / TRM;
    IVA13 = IVA13 / TRM;
    IVA14 = IVA14 / TRM;
    SUMAEX = SUMAEX / TRM;
    SUMAGR = SUMAGR / TRM;
    SUMAINALC = SUMAINALC / TRM;
    TOTCONSUMO = TOTCONSUMO / TRM;
    TOTINALC = TOTINALC / TRM;
    DTOIT1M = DTOIT1M / TRM;
    DTOIT2M = DTOIT2M / TRM;
    DTOIT3M = DTOIT3M / TRM;
    END
SELECT COUNT(FADE_ITEM) from FACTURAS_DETALLE WHERE FACT_ID = :ID INTO :numitems;
SELECT FORM_NROITEMS FROM FORMATOS WHERE TIDO_COD = 31 AND PREF_PRE = :pref INTO :ITEMFOR;
if (ITEMFOR > 0) then
    pagtotal = CEIL(CAST(NUMITEMS AS DOUBLE PRECISION)/CAST(ITEMFOR AS DOUBLE PRECISION));
ELSE
    PAGTOTAL = 0;
TOTAHORRO = 0;
EXECUTE PROCEDURE lee_configuracion ('FACTURACION','FACTURAS','ORDENAR ITEMS POR CODIGO DE ARTICULO') returning_values (:ORDENCOD);
EXECUTE PROCEDURE lee_configuracion ('FACTURACION','POS', 'IMPRIMIR DEVOLUCIONES DE ARTICULOS NEGATIVOS') returning_values (:imprdev);
EXECUTE PROCEDURE lee_configuracion ('FACTURACION','FACTURAS', 'IMPRIMIR DETALLE DE PRODUCTOS ENSAMBLADOS AUTOMATICAMENTE CON LA FACTURA') returning_values (:imprens);
if (ORDENCOD = 'SI') then
    BEGIN
    FOR SELECT FADE_ITEM, D.ARTI_COD, FADE_CODBAR, FADE_DESC, ARTI_DESCORTA, FADE_CANT, FADE_UNIDAD, FADE_FACTOR, BODE_COD, FADE_LOTE, LIPR_COD, FADE_PRUNIT, FADE_DTOPORC, FADE_DTOMONTO, FADE_IVAPORC, FADE_IVAMONTO, FADE_CONSUMO, FADE_TOTAL, FADE_REFERENCIA,
        GRUP_COD, SUBG_COD, MARC_COD, FABR_COD, ARTI_PESO, ARTI_ANCHO, ARTI_ALTO, ARTI_LARGO, fade_tiva, FADE_DEVUELTO, FADE_OBS, FADE_DTO1, FADE_DTO2, FADE_DTO3, FADE_DTOM1, FADE_DTOM2, FADE_DTOM3, FADE_CAJAS, FADE_BASE, FADE_PORCBASE, FADE_INALCM, FADE_INALCP,
        FADE_LLEVAR, ARTI_UNIDAD, ARTI_RESUNI, FADE_IDORI, FADE_PRECIOREF, fade_impba, fade_impupp, fade_impupm, fade_mandante
        FROM FACTURAS_DETALLE D, ARTICULO A
        WHERE D.ARTI_COD = A.ARTI_COD AND D.FACT_ID = :ID AND ((:TIPOFE <> 9) or ((D.ARTI_COD <> :artaiua) AND (D.ARTI_COD <> :artaiui) AND (D.ARTI_COD <> :artaiuu)))
        ORDER BY D.ARTI_COD
        INTO :ITEM, :ARTICULO, :CODBAR, :DESAUX, :DESCORTA, :CANT, :UNIDAD, :FACTOR, :BODITEM, :LOTE, :LISTAPR, :PRUNIT, :DTOITPORC, :DTOITMONTO, :IVAPORC, :IVAITMONTO, :CONSUMO, :TOTAL, :refitem,
        :GRUPO, :SUBGRUPO, :MARCA, :FABR, :PESO, :ANCHO, :ALTO, :LARGO, :TARIFA, :devuelto, :obsitem, :dtoit1, :dtoit2, :dtoit3, :dtoitem1, :dtoitem2, :dtoitem3, :cajas, :base, :porcbase, :inalc, :inalcp,
        :LLEVAR, :UNDPPAL, :undresaltar, :IDORI, :precioref, :itimpba, :itimpupp, :itimpupm, :mandante
        DO
          BEGIN
          vlote = null;
          if ((PROVTEC = 'DATAICO') OR (PROVTEC = 'FACTURATECH') or (PROVTEC = 'DIANSYSPLUS')) then
            execute procedure nombre_ascii(:DESAUX) returning_values(:artides);
          else
            artides = desaux;
          if (ARTICULO = CODBAR) then
            SELECT FIRST 1 COBA_COD FROM barras_articulo WHERE ARTI_COD = :articulo INTO :CODBAR;
          if (DTOIT1 IS NULL) then
            DTOIT1 = 0;
          if (DTOIT2 IS NULL) then
            DTOIT2 = 0;
          if (DTOIT3 IS NULL) then
            DTOIT3 = 0;
          if (DTOITEM1 IS NULL) then
            DTOITEM1 = 0;
          if (DTOITEM2 IS NULL) then
            DTOITEM2 = 0;
          if (DTOITEM3 IS NULL) then
            DTOITEM3 = 0;
          TOTDESCITEM = DTOITEM1 + DTOITEM2 + DTOITEM3;
          if (UNDPPAL <> UNIDAD) THEN
              select unar_resaltar from unidad_articulo where unar_unidad = :unidad and arti_cod = :articulo and unar_activa = 'S' into :undresaltar;
          if (UNDRESALTAR = 'S') then
            UNDRESALTAR = '*';
          ELSE
            UNDRESALTAR = '';
          if (LLEVAR = 'S') then
            LLEVAR = '*';
          ELSE
            LLEVAR = '';
          if (IMPRDEV <> 'SI') then
            BEGIN
            if ((CANT >= 0) AND (DEVUELTO < CANT*FACTOR)) then
                IMPR = 'S';
            ELSE
                if ((DEVUELTO > 0) or (CANT < 0))  then
                    if (EXISTS (SELECT FADE_ITEM FROM FACTURAS_DETALLE WHERE FADE_CANT = (:CANT*-1) AND FADE_UNIDAD = :UNIDAD AND FACT_ID = :ID AND ARTI_COD = :ARTICULO)) then
                        IMPR = 'N'; /* ES DEVOLUCION HECHA EN LA FACTURA */
                    ELSE
                        IMPR = 'S'; /* ES DEVOLUCION HECHA FUERA DE LA FACTURA */
                ELSE
                    IMPR = 'S'; /* ITEM SIN DEVOLUCION */
            END
          ELSE
            IMPR = 'S';
          if (IMPR = 'S') then
            BEGIN
            EXECUTE procedure nombres_grupos_inventario (GRUPO, SUBGRUPO, MARCA, FABR)
                returning_values (NOMGRUPO, NOMSUBG, NOMMARCA, NOMFABR);
            if (CANT <> 0) then
                prneto = (PRUNIT - DTOITMONTO) * ((100 - dtoit1)/100) * ((100-dtoit2)/100) * ((100-dtoit3)/100);
            ELSE
                prneto = PRUNIT - DTOITMONTO;
            PRMAX = 0;
            SELECT PRAR_FIJO FROM PRECIOS_ARTICULO P
                WHERE P.arti_cod = :articulo AND P.lipr_cod = :listapr INTO :PRMAX;
            PRMAX = PRMAX * FACTOR;
            if (PRREF = 'SI') then
                AHORRO = (precioref - prneto) * cant;
            else
                AHORRO = (:PRMAX - PRNETO) * CANT;
            if (ahorro < 0) then
                ahorro = 0;
            TOTAHORRO = TOTAHORRO + AHORRO;
            if (IMPTOS = 'S') then
                begin
                if (cant <> 0) then
                    begin
                    if (INALC <> 0) then
                        prsiniva = (PRUNIT - (CONSUMO / CANT)) / ((100 + inalcp)/100);
                    else
                        prsiniva = (PRUNIT - (CONSUMO / CANT)) / ((100 + ivaporc)/100);
                    prnetosiniva = (PRUNIT - DTOITMONTO - ((IVAITMONTO + CONSUMO + inalc) / CANT));
                    prnetosiniva = prnetosiniva * ((100 - dtoit1)/100);
                    prnetosiniva = prnetosiniva * ((100-dtoit2)/100);
                    prnetosiniva = prnetosiniva * ((100-dtoit3)/100);
                    end
                else
                    begin
                    prsiniva = PRUNIT - IVAITMONTO - CONSUMO - INALC;
                    prnetosiniva = PRUNIT - DTOITMONTO;
                    end
                end
            else
                begin
                prsiniva = prunit;
                prnetosiniva = PRUNIT - DTOITMONTO;
                end
--            if (ICOINC <> 'SI') then
--                SUBTOTIT = TOTAL - IVAITMONTO;
--            else
                SUBTOTIT = TOTAL - IVAITMONTO - CONSUMO - INALC;
            SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
            if (extract(year from vlote) = 9999) then
                vlote = null;

            if (ANCHO IS NULL) then
                ANCHO = 0;
            if (ALTO IS NULL) then
                ALTO = 0;
            if (LARGO IS NULL) then
                LARGO = 0;
            if (PESO IS NULL) then
                PESO = 0;
            if ((itimpba <> 0) AND (PESO <> 0)) then
                begin
                itimpbac = CANT * PESO;
                itimpbau = CAST((:itimpba / (:CANT * :PESO / 100)) AS NUMERIC(18,2));
                end 
            PESO = (PESO / 1000) * CANT * FACTOR;
            PESOTOT = PESOTOT + PESO;
            if (LEFT(ARTICULO,2) = '.t') then
                BEGIN
                REFITEM = '';
                TOTAL = 0;
                SUBTOTIT = 0;
                ARTICULO = '';
                CODBAR = '';
                if (SUBSTRING(ARTIDES FROM 1 FOR 3) <> '***') then
                    ARTIDES = '*** ' || ARTIDES || ' ***';
                END
            SELECT STAND_COD FROM STANDS WHERE ARTI_COD = :ARTICULO AND STAND_BODEGA = :boditem INTO :stand;
            factcant = NULL;
            SELECT FIRST 1 UNAR_FACCAN, UNAR_UNIDAD FROM unidad_articulo WHERE ARTI_COD = :articulo and unar_activa = 'S' and unar_faccan <= (:CANT * :FACTOR) AND UNAR_FACCAN >= 1
                order by unar_faccan desc
                INTO :factcant, :unialterna;
            if ((factcant IS NULL) or (factcant = 0)) then
                BEGIN
                ALTERNATIVAS = 0;
                PRINCIPALES = (CANT * FACTOR);
                SELECT ARTI_UNIDAD FROM ARTICULO WHERE ARTI_COD = :ARTICULO INTO :unialterna;
                END
            ELSE
                BEGIN
                ALTERNATIVAS = FLOOR(CANT * factor / factcant);
                PRINCIPALES = (CANT * FACTOR) - (alternativas * factcant);
                if (ALTERNATIVAS = 0) then
                    SELECT ARTI_UNIDAD FROM ARTICULO WHERE ARTI_COD = :ARTICULO INTO :unialterna;
                END
            if ((MONEDAEX = 'S') AND (TRM <> 1)) then
                BEGIN
                PRUNIT = PRUNIT / TRM;
                prsiniva = prsiniva / TRM;
                DTOITMONTO = DTOITMONTO / TRM;
                PRNETO = PRNETO / TRM;
                PRNETOSINIVA = PRNETOSINIVA / TRM;
                BASE = base / TRM;
                IVAITMONTO = IVAITMONTO / TRM;
                CONSUMO = consumo / TRM;
                INALC = INALC / TRM;
                SUBTOTIT = SUBTOTIT / TRM;
                TOTAL = TOTAL / TRM;
                END
            EXECUTE PROCEDURE seriales_item_documento(31, :ID, :ITEM) returning_values (:SERIALES);
            if (OMITEREP = 'SI') then
                if (ARTICULO = codanterior) then
                    BEGIN
                    codanterior = ARTICULO;
                    ARTICULO = '';
                    CODBAR = '';
                    ARTIDES = '';
                    DESCORTA = '';
                    END
                ELSE
                    codanterior = ARTICULO;
            select VEND_NOMBRE from REMISIONES_VENTA P, VENDEDORES V where P.VEND_COD = V.VEND_COD AND REVT_ID = :IDORI into :NOMVENDREM;
            impbolsa = 0;
            if (ARTBOLSA = ARTICULO) then
                BEGIN
                impbolsa = CONSUMO;
                CONSUMO = 0;
                END
            SUSPEND;
            i = i + 1;
            /* el detalle si hubo ensamble */
            if (IMPRENS = 'SI') then
              FOR SELECT '    ' || max(ed.arti_cod), SUM(ESDE_CANT*ENSA_CANT), SUM(ESDE_CANT), MAX(ESDE_LOTE), MAX(ESDE_UNIDAD), MAX(TAIV_PORC), '    ' || max(arti_des), MAX(ESDE_PRECIO)
                FROM ENSAMBLES_DETALLE ED, ENSAMBLES E, articulo a, TARIFA_IVA T
                WHERE E.ensa_tiporef = 31 AND E.ensa_idref = :id AND E.arti_cod = :articulo and a.arti_cod = ed.arti_cod
                AND A.taiv_cod = T.taiv_cod and e.ensa_id = ed.ensa_id and e.ensa_itemref = :item
                GROUP BY ED.ARTI_COD, ED.esde_unidad, ED.esde_lote
                into :articulo, :cant, :cantens, :lote, :unidad, :ivaporc, :desaux, :prunit
                do
                begin
                vlote = null;
                if ((PROVTEC = 'DATAICO') OR (PROVTEC = 'FACTURATECH') or (PROVTEC = 'DIANSYSPLUS')) then
                    execute procedure nombre_ascii(:DESAUX) returning_values(:artides);
                else
                    artides = desaux;
                if (cantot = 'SI') then
                    CANT = cantens;
                prnetosiniva = PRUNIT;
                DTOITPORC = 0;
                DTOITMONTO = 0;
                IVAITMONTO = 0;
                CONSUMO = 0;
                itimpba = 0;
                itimpupm = 0;
                itimpupp = 0;
                subtotit = 0;
                TOTAL = 0;
                SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
                if (extract(year from vlote) = 9999) then
                    vlote = null;
                SUSPEND;
                end
            END
          END
    END
ELSE
  if (ORDENCOD = 'UNIDAD') then
    BEGIN
    FOR SELECT FADE_ITEM, D.ARTI_COD, FADE_CODBAR, FADE_DESC, ARTI_DESCORTA, FADE_CANT, FADE_UNIDAD, FADE_FACTOR, BODE_COD, FADE_LOTE, LIPR_COD, FADE_PRUNIT, FADE_DTOPORC, FADE_DTOMONTO, FADE_IVAPORC, FADE_IVAMONTO, FADE_CONSUMO, FADE_TOTAL, FADE_REFERENCIA,
        GRUP_COD, SUBG_COD, MARC_COD, FABR_COD, ARTI_PESO, ARTI_ANCHO, ARTI_ALTO, ARTI_LARGO, fade_tiva, FADE_DEVUELTO, FADE_OBS, FADE_DTO1, FADE_DTO2, FADE_DTO3, FADE_DTOM1, FADE_DTOM2, FADE_DTOM3, FADE_CAJAS, FADE_BASE, FADE_PORCBASE, FADE_INALCM, FADE_INALCP,
        FADE_LLEVAR, ARTI_UNIDAD, ARTI_RESUNI, FADE_IDORI, FADE_PRECIOREF, fade_impba, fade_impupp, fade_impupm, fade_mandante
        FROM FACTURAS_DETALLE D, ARTICULO A
        WHERE D.ARTI_COD = A.ARTI_COD AND D.FACT_ID = :ID AND ((:TIPOFE <> 9) or ((D.ARTI_COD <> :artaiua) AND (D.ARTI_COD <> :artaiui) AND (D.ARTI_COD <> :artaiuu)))
        ORDER BY D.fade_unidad, D.fade_desc
        INTO :ITEM, :ARTICULO, :CODBAR, :DESAUX, :DESCORTA, :CANT, :UNIDAD, :FACTOR, :BODITEM, :LOTE, :LISTAPR, :PRUNIT, :DTOITPORC, :DTOITMONTO, :IVAPORC, :IVAITMONTO, :CONSUMO, :TOTAL, :refitem,
        :GRUPO, :SUBGRUPO, :MARCA, :FABR, :PESO, :ANCHO, :ALTO, :LARGO, :TARIFA, :devuelto, :obsitem, :dtoit1, :dtoit2, :dtoit3, :dtoitem1, :dtoitem2, :dtoitem3,
        :cajas, :base, :porcbase, :INALC, :INALCP, :LLEVAR, :UNDPPAL, :undresaltar, :IDORI, :precioref, :itimpba, :itimpupp, :itimpupm, :mandante
        DO
          BEGIN
          vlote = null;
          if ((PROVTEC = 'DATAICO') OR (PROVTEC = 'FACTURATECH') or (PROVTEC = 'DIANSYSPLUS')) then
            execute procedure nombre_ascii(:DESAUX) returning_values(:artides);
          else
            artides = desaux;
          if (DTOIT1 IS NULL) then
            DTOIT1 = 0;
          if (DTOIT2 IS NULL) then
            DTOIT2 = 0;
          if (DTOIT3 IS NULL) then
            DTOIT3 = 0;
          if (DTOITEM1 IS NULL) then
            DTOITEM1 = 0;
          if (DTOITEM2 IS NULL) then
            DTOITEM2 = 0;
          if (DTOITEM3 IS NULL) then
            DTOITEM3 = 0;
          TOTDESCITEM = DTOITEM1 + DTOITEM2 + DTOITEM3;
          if (ARTICULO = CODBAR) then
            SELECT FIRST 1 COBA_COD FROM barras_articulo WHERE ARTI_COD = :articulo INTO :CODBAR;
          if (UNDPPAL <> UNIDAD) THEN
              select unar_resaltar from unidad_articulo where unar_unidad = :unidad and arti_cod = :articulo and unar_activa = 'S' into :undresaltar;
          if (UNDRESALTAR = 'S') then
            UNDRESALTAR = '*';
          ELSE
            UNDRESALTAR = '';
          if (LLEVAR = 'S') then
            LLEVAR = '*';
          ELSE
            LLEVAR = '';
          if (IMPRDEV <> 'SI') then
            BEGIN
            if ((CANT >= 0) AND (DEVUELTO < CANT*FACTOR)) then
                IMPR = 'S';
            ELSE
                if ((DEVUELTO > 0) or (CANT < 0))  then
                    if (EXISTS (SELECT FADE_ITEM FROM FACTURAS_DETALLE WHERE FADE_CANT = (:CANT*-1) AND FADE_UNIDAD = :UNIDAD AND FACT_ID = :ID AND ARTI_COD = :ARTICULO)) then
                        IMPR = 'N'; /* ES DEVOLUCION HECHA EN LA FACTURA */
                    ELSE
                        IMPR = 'S'; /* ES DEVOLUCION HECHA FUERA DE LA FACTURA */
                ELSE
                    IMPR = 'S'; /* ITEM SIN DEVOLUCION */
            END
          ELSE
            IMPR = 'S';
          if (IMPR = 'S') then
            BEGIN
            EXECUTE procedure nombres_grupos_inventario (GRUPO, SUBGRUPO, MARCA, FABR)
                returning_values (NOMGRUPO, NOMSUBG, NOMMARCA, NOMFABR);
            if (CANT <> 0) then
                prneto = (PRUNIT - DTOITMONTO) * ((100 - dtoit1)/100) * ((100-dtoit2)/100) * ((100-dtoit3)/100);
            ELSE
                prneto = PRUNIT - DTOITMONTO;
            PRMAX = 0;
            SELECT PRAR_FIJO FROM PRECIOS_ARTICULO P
                WHERE P.arti_cod = :articulo AND P.lipr_cod = :listapr INTO :PRMAX;
            PRMAX = PRMAX * FACTOR;
            if (PRREF = 'SI') then
                AHORRO = (precioref - prneto) * cant;
            else
                AHORRO = (:PRMAX - PRNETO) * CANT;
            if (ahorro < 0) then
                ahorro = 0;
            TOTAHORRO = TOTAHORRO + AHORRO;
            if (IMPTOS = 'S') then
                begin
                if (cant <> 0) then
                    begin
                    if (INALC <> 0) then
                        prsiniva = (PRUNIT - (CONSUMO / CANT)) / ((100 + inalcp)/100);
                    else
                        prsiniva = (PRUNIT - (CONSUMO / CANT)) / ((100 + ivaporc)/100);
                    prnetosiniva = (PRUNIT - DTOITMONTO - ((IVAITMONTO + CONSUMO + INALC) / CANT));
                    prnetosiniva = prnetosiniva * ((100 - dtoit1)/100);
                    prnetosiniva = prnetosiniva * ((100-dtoit2)/100);
                    prnetosiniva = prnetosiniva * ((100-dtoit3)/100);
                    end
                else
                    begin
                    prsiniva = PRUNIT - IVAITMONTO - CONSUMO - INALC;
                    prnetosiniva = PRUNIT - DTOITMONTO;
                    end
                end
            else
                begin
                prsiniva = prunit;
                prnetosiniva = PRUNIT - DTOITMONTO;
                end
--            if (ICOINC <> 'SI') then
--                SUBTOTIT = TOTAL - IVAITMONTO;
--            else
                SUBTOTIT = TOTAL - IVAITMONTO - CONSUMO - INALC;
            SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
            if (extract(year from vlote) = 9999) then
                vlote = null;
            if (ANCHO IS NULL) then
                ANCHO = 0;
            if (ALTO IS NULL) then
                ALTO = 0;
            if (LARGO IS NULL) then
                LARGO = 0;
            if (PESO IS NULL) then
                PESO = 0;
            if ((itimpba <> 0) AND (PESO <> 0)) then
                begin
                itimpbac = CANT * PESO;
                itimpbau = CAST((:itimpba / (:CANT * :PESO / 100)) AS NUMERIC(18,2));
                end 
            PESO = (PESO / 1000) * CANT * FACTOR;
            PESOTOT = PESOTOT + PESO;
            if (LEFT(ARTICULO,2) = '.t') then
                BEGIN
                REFITEM = '';
                TOTAL = 0;
                SUBTOTIT = 0;
                ARTICULO = '';
                CODBAR = '';
                if (SUBSTRING(ARTIDES FROM 1 FOR 3) <> '***') then
                    ARTIDES = '*** ' || ARTIDES || ' ***';
                END
            SELECT STAND_COD FROM STANDS WHERE ARTI_COD = :ARTICULO AND STAND_BODEGA = :boditem INTO :stand;
            factcant = NULL;
            SELECT FIRST 1 UNAR_FACCAN, UNAR_UNIDAD FROM unidad_articulo WHERE ARTI_COD = :articulo and unar_activa = 'S' and unar_faccan <= (:CANT * :FACTOR) AND UNAR_FACCAN >= 1
                order by unar_faccan desc
                INTO :factcant, :unialterna;
            if ((factcant IS NULL) or (factcant = 0)) then
                BEGIN
                ALTERNATIVAS = 0;
                PRINCIPALES = (CANT * FACTOR);
                SELECT ARTI_UNIDAD FROM ARTICULO WHERE ARTI_COD = :ARTICULO INTO :unialterna;
                END
            ELSE
                BEGIN
                ALTERNATIVAS = FLOOR(CANT * factor / factcant);
                PRINCIPALES = (CANT * FACTOR) - (alternativas * factcant);
                if (ALTERNATIVAS = 0) then
                    SELECT ARTI_UNIDAD FROM ARTICULO WHERE ARTI_COD = :ARTICULO INTO :unialterna;
                END
            if ((MONEDAEX = 'S') AND (TRM <> 1)) then
                BEGIN
                PRUNIT = PRUNIT / TRM;
                prsiniva = prsiniva / TRM;
                DTOITMONTO = DTOITMONTO / TRM;
                PRNETO = PRNETO / TRM;
                PRNETOSINIVA = PRNETOSINIVA / TRM;
                BASE = base / TRM;
                IVAITMONTO = IVAITMONTO / TRM;
                CONSUMO = consumo / TRM;
                INALC = INALC / TRM;
                SUBTOTIT = SUBTOTIT / TRM;
                TOTAL = TOTAL / TRM;
                END
            EXECUTE PROCEDURE seriales_item_documento(31, :ID, :ITEM) returning_values (:SERIALES);
            if (OMITEREP = 'SI') then
                if (ARTICULO = codanterior) then
                    BEGIN
                    codanterior = ARTICULO;
                    ARTICULO = '';
                    CODBAR = '';
                    ARTIDES = '';
                    DESCORTA = '';
                    END
                ELSE
                    codanterior = ARTICULO;
            select VEND_NOMBRE from REMISIONES_VENTA P, VENDEDORES V where P.VEND_COD = V.VEND_COD AND REVT_ID = :IDORI into :NOMVENDREM;
            impbolsa = 0;
            if (ARTBOLSA = ARTICULO) then
                BEGIN
                impbolsa = CONSUMO;
                CONSUMO = 0;
                END
            SUSPEND;
            i = i + 1;
            /* el detalle si hubo ensamble */
            if (IMPRENS = 'SI') then
              FOR SELECT '    ' || max(ed.arti_cod), SUM(ESDE_CANT*ENSA_CANT), SUM(ESDE_CANT), MAX(ESDE_LOTE), MAX(ESDE_UNIDAD), MAX(TAIV_PORC), '    ' || max(arti_des), MAX(ESDE_PRECIO)
                FROM ENSAMBLES_DETALLE ED, ENSAMBLES E, articulo a, TARIFA_IVA T
                WHERE E.ensa_tiporef = 31 AND E.ensa_idref = :id AND E.arti_cod = :articulo and a.arti_cod = ed.arti_cod
                AND A.taiv_cod = T.taiv_cod and e.ensa_id = ed.ensa_id and e.ensa_itemref = :item
                GROUP BY ED.ARTI_COD, ED.esde_unidad, ED.esde_lote
                into :articulo, :cant, :cantens, :lote, :unidad, :ivaporc, :desaux, :prunit
                do
                begin
                vlote = null;
                if ((PROVTEC = 'DATAICO') OR (PROVTEC = 'FACTURATECH') or (PROVTEC = 'DIANSYSPLUS')) then
                    execute procedure nombre_ascii(:DESAUX) returning_values(:artides);
                else
                    artides = desaux;
                if (cantot = 'SI') then
                    CANT = cantens;
                prnetosiniva = PRUNIT;
                DTOITPORC = 0;
                DTOITMONTO = 0;
                IVAITMONTO = 0;
                CONSUMO = 0;
                itimpba = 0;
                itimpupm = 0;
                itimpupp = 0;
                subtotit = 0;
                TOTAL = 0;
                SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
                if (extract(year from vlote) = 9999) then
                    vlote = null;
                SUSPEND;
                end
            END
          END
    END
  ELSE if (ORDENCOD = 'MARCA') then
    BEGIN
    FOR SELECT FADE_ITEM, D.ARTI_COD, FADE_CODBAR, FADE_DESC, ARTI_DESCORTA, FADE_CANT, FADE_UNIDAD, FADE_FACTOR, BODE_COD, FADE_LOTE, LIPR_COD, FADE_PRUNIT, FADE_DTOPORC, FADE_DTOMONTO, FADE_IVAPORC, FADE_IVAMONTO, FADE_CONSUMO, FADE_TOTAL, FADE_REFERENCIA,
        GRUP_COD, SUBG_COD, MARC_COD, FABR_COD, ARTI_PESO, ARTI_ANCHO, ARTI_ALTO, ARTI_LARGO, fade_tiva, FADE_DEVUELTO, FADE_OBS, FADE_DTO1, FADE_DTO2, FADE_DTO3, FADE_DTOM1, FADE_DTOM2, FADE_DTOM3,
        FADE_CAJAS, FADE_BASE, FADE_PORCBASE, FADE_INALCM, FADE_INALCP, FADE_LLEVAR, ARTI_UNIDAD, ARTI_RESUNI, FADE_IDORI, FADE_PRECIOREF, fade_impba, fade_impupp, fade_impupm, fade_mandante
        FROM FACTURAS_DETALLE D, ARTICULO A
        WHERE D.ARTI_COD = A.ARTI_COD AND D.FACT_ID = :ID AND ((:TIPOFE <> 9) or ((D.ARTI_COD <> :artaiua) AND (D.ARTI_COD <> :artaiui) AND (D.ARTI_COD <> :artaiuu)))
        ORDER BY A.marc_cod, D.fade_desc
        INTO :ITEM, :ARTICULO, :CODBAR, :DESAUX, :DESCORTA, :CANT, :UNIDAD, :FACTOR, :BODITEM, :LOTE, :LISTAPR, :PRUNIT, :DTOITPORC, :DTOITMONTO, :IVAPORC, :IVAITMONTO, :CONSUMO, :TOTAL, :refitem,
        :GRUPO, :SUBGRUPO, :MARCA, :FABR, :PESO, :ANCHO, :ALTO, :LARGO, :TARIFA, :devuelto, :obsitem, :dtoit1, :dtoit2, :dtoit3, :dtoitem1, :dtoitem2, :dtoitem3,
        :cajas, :base, :porcbase, :INALC, :INALCP, :LLEVAR, :UNDPPAL, :undresaltar, :IDORI, :PRECIOREF, :itimpba, :itimpupp, :itimpupm, :mandante
        DO
          BEGIN
          vlote = null;
          if ((PROVTEC = 'DATAICO') OR (PROVTEC = 'FACTURATECH') or (PROVTEC = 'DIANSYSPLUS')) then
            execute procedure nombre_ascii(:DESAUX) returning_values(:artides);
          else
            artides = desaux;
          if (DTOIT1 IS NULL) then
            DTOIT1 = 0;
          if (DTOIT2 IS NULL) then
            DTOIT2 = 0;
          if (DTOIT3 IS NULL) then
            DTOIT3 = 0;
          if (DTOITEM1 IS NULL) then
            DTOITEM1 = 0;
          if (DTOITEM2 IS NULL) then
            DTOITEM2 = 0;
          if (DTOITEM3 IS NULL) then
            DTOITEM3 = 0;
          TOTDESCITEM = DTOITEM1 + DTOITEM2 + DTOITEM3;
          if (ARTICULO = CODBAR) then
            SELECT FIRST 1 COBA_COD FROM barras_articulo WHERE ARTI_COD = :articulo INTO :CODBAR;
          if (UNDPPAL <> UNIDAD) THEN
              select unar_resaltar from unidad_articulo where unar_unidad = :unidad and arti_cod = :articulo and unar_activa = 'S' into :undresaltar;
          if (UNDRESALTAR = 'S') then
            UNDRESALTAR = '*';
          ELSE
            UNDRESALTAR = '';
          if (LLEVAR = 'S') then
            LLEVAR = '*';
          ELSE
            LLEVAR = '';
          if (IMPRDEV <> 'SI') then
            BEGIN
            if ((CANT >= 0) AND (DEVUELTO < CANT*FACTOR)) then
                IMPR = 'S';
            ELSE
                if ((DEVUELTO > 0) or (CANT < 0))  then
                    if (EXISTS (SELECT FADE_ITEM FROM FACTURAS_DETALLE WHERE FADE_CANT = (:CANT*-1) AND FADE_UNIDAD = :UNIDAD AND FACT_ID = :ID AND ARTI_COD = :ARTICULO)) then
                        IMPR = 'N'; /* ES DEVOLUCION HECHA EN LA FACTURA */
                    ELSE
                        IMPR = 'S'; /* ES DEVOLUCION HECHA FUERA DE LA FACTURA */
                ELSE
                    IMPR = 'S'; /* ITEM SIN DEVOLUCION */
            END
          ELSE
            IMPR = 'S';
          if (IMPR = 'S') then
            BEGIN
            EXECUTE procedure nombres_grupos_inventario (GRUPO, SUBGRUPO, MARCA, FABR)
                returning_values (NOMGRUPO, NOMSUBG, NOMMARCA, NOMFABR);
            if (CANT <> 0) then
                prneto = (PRUNIT - DTOITMONTO) * ((100 - dtoit1)/100) * ((100-dtoit2)/100) * ((100-dtoit3)/100);
            ELSE
                prneto = PRUNIT - DTOITMONTO;
            PRMAX = 0;
            SELECT PRAR_FIJO FROM PRECIOS_ARTICULO P
                WHERE P.arti_cod = :articulo AND P.lipr_cod = :listapr INTO :PRMAX;
            PRMAX = PRMAX * FACTOR;
            if (PRREF = 'SI') then
                AHORRO = (precioref - prneto) * cant;
            else
                AHORRO = (:PRMAX - PRNETO) * CANT;
            if (ahorro < 0) then
                ahorro = 0;
            TOTAHORRO = TOTAHORRO + AHORRO;
            if (IMPTOS = 'S') then
                begin
                if (cant <> 0) then
                    begin
                    if (INALC <> 0) then
                        prsiniva = (PRUNIT - (CONSUMO / CANT)) / ((100 + inalcp)/100);
                    else
                        prsiniva = (PRUNIT - (CONSUMO / CANT)) / ((100 + ivaporc)/100);
                    prnetosiniva = (PRUNIT - DTOITMONTO - ((IVAITMONTO + CONSUMO + INALC) / CANT));
                    prnetosiniva = prnetosiniva * ((100 - dtoit1)/100);
                    prnetosiniva = prnetosiniva * ((100-dtoit2)/100);
                    prnetosiniva = prnetosiniva * ((100-dtoit3)/100);
                    end
                else
                    begin
                    prsiniva = PRUNIT - IVAITMONTO - CONSUMO - INALC;
                    prnetosiniva = PRUNIT - DTOITMONTO;
                    end
                end
            else
                begin
                prsiniva = prunit;
                prnetosiniva = PRUNIT - DTOITMONTO;
                end
--            if (ICOINC <> 'SI') then
--                SUBTOTIT = TOTAL - IVAITMONTO;
--            else
                SUBTOTIT = TOTAL - IVAITMONTO - CONSUMO - INALC;
            SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
            if (extract(year from vlote) = 9999) then
                vlote = null;
            if (ANCHO IS NULL) then
                ANCHO = 0;
            if (ALTO IS NULL) then
                ALTO = 0;
            if (LARGO IS NULL) then
                LARGO = 0;
            if (PESO IS NULL) then
                PESO = 0;
            if ((itimpba <> 0) AND (PESO <> 0)) then
                begin
                itimpbac = CANT * PESO;
                itimpbau = CAST((:itimpba / (:CANT * :PESO / 100)) AS NUMERIC(18,2));
                end 
            PESO = (PESO / 1000) * CANT * FACTOR;
            PESOTOT = PESOTOT + PESO;
            if (LEFT(ARTICULO,2) = '.t') then
                BEGIN
                REFITEM = '';
                TOTAL = 0;
                SUBTOTIT = 0;
                ARTICULO = '';
                CODBAR = '';
                if (SUBSTRING(ARTIDES FROM 1 FOR 3) <> '***') then
                    ARTIDES = '*** ' || ARTIDES || ' ***';
                END
            SELECT STAND_COD FROM STANDS WHERE ARTI_COD = :ARTICULO AND STAND_BODEGA = :boditem INTO :stand;
            factcant = NULL;
            SELECT FIRST 1 UNAR_FACCAN, UNAR_UNIDAD FROM unidad_articulo WHERE ARTI_COD = :articulo and unar_activa = 'S' and unar_faccan <= (:CANT * :FACTOR) AND UNAR_FACCAN >= 1
                order by unar_faccan desc
                INTO :factcant, :unialterna;
            if ((factcant IS NULL) or (factcant = 0)) then
                BEGIN
                ALTERNATIVAS = 0;
                PRINCIPALES = (CANT * FACTOR);
                SELECT ARTI_UNIDAD FROM ARTICULO WHERE ARTI_COD = :ARTICULO INTO :unialterna;
                END
            ELSE
                BEGIN
                ALTERNATIVAS = FLOOR(CANT * factor / factcant);
                PRINCIPALES = (CANT * FACTOR) - (alternativas * factcant);
                if (ALTERNATIVAS = 0) then
                    SELECT ARTI_UNIDAD FROM ARTICULO WHERE ARTI_COD = :ARTICULO INTO :unialterna;
                END
            if ((MONEDAEX = 'S') AND (TRM <> 1)) then
                BEGIN
                PRUNIT = PRUNIT / TRM;
                prsiniva = prsiniva / TRM;
                DTOITMONTO = DTOITMONTO / TRM;
                PRNETO = PRNETO / TRM;
                PRNETOSINIVA = PRNETOSINIVA / TRM;
                BASE = base / TRM;
                IVAITMONTO = IVAITMONTO / TRM;
                CONSUMO = consumo / TRM;
                INALC = INALC / TRM;
                SUBTOTIT = SUBTOTIT / TRM;
                TOTAL = TOTAL / TRM;
                END
            EXECUTE PROCEDURE seriales_item_documento(31, :ID, :ITEM) returning_values (:SERIALES);
            if (OMITEREP = 'SI') then
                if (ARTICULO = codanterior) then
                    BEGIN
                    codanterior = ARTICULO;
                    ARTICULO = '';
                    CODBAR = '';
                    ARTIDES = '';
                    DESCORTA = '';
                    END
                ELSE
                    codanterior = ARTICULO;
            select VEND_NOMBRE from REMISIONES_VENTA P, VENDEDORES V where P.VEND_COD = V.VEND_COD AND REVT_ID = :IDORI into :NOMVENDREM;
            impbolsa = 0;
            if (ARTBOLSA = ARTICULO) then
                BEGIN
                impbolsa = CONSUMO;
                CONSUMO = 0;
                END
            SUSPEND;
            i = i + 1;
            /* el detalle si hubo ensamble */
            if (IMPRENS = 'SI') then
              FOR SELECT '    ' || max(ed.arti_cod), SUM(ESDE_CANT*ENSA_CANT), SUM(ESDE_CANT), MAX(ESDE_LOTE), MAX(ESDE_UNIDAD), MAX(TAIV_PORC), '    ' || max(arti_des), MAX(ESDE_PRECIO)
                FROM ENSAMBLES_DETALLE ED, ENSAMBLES E, articulo a, TARIFA_IVA T
                WHERE E.ensa_tiporef = 31 AND E.ensa_idref = :id AND E.arti_cod = :articulo and a.arti_cod = ed.arti_cod
                AND A.taiv_cod = T.taiv_cod and e.ensa_id = ed.ensa_id and e.ensa_itemref = :item
                GROUP BY ED.ARTI_COD, ED.esde_unidad, ED.esde_lote
                into :articulo, :cant, :cantens, :lote, :unidad, :ivaporc, :desaux, :prunit
                do
                begin
                vlote = null;
                if ((PROVTEC = 'DATAICO') OR (PROVTEC = 'FACTURATECH') or (PROVTEC = 'DIANSYSPLUS')) then
                    execute procedure nombre_ascii(:DESAUX) returning_values(:artides);
                else
                    artides = desaux;
                if (cantot = 'SI') then
                    CANT = cantens;
                prnetosiniva = PRUNIT;
                DTOITPORC = 0;
                DTOITMONTO = 0;
                IVAITMONTO = 0;
                CONSUMO = 0;
                itimpba = 0;
                itimpupm = 0;
                itimpupp = 0;
                subtotit = 0;
                TOTAL = 0;
                SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
                if (extract(year from vlote) = 9999) then
                    vlote = null;
                SUSPEND;
                end
            END
          END
    END
  ELSE
    if (ORDENCOD = 'DESCRIPCION') then
      BEGIN
      FOR SELECT FADE_ITEM, D.ARTI_COD, FADE_CODBAR, FADE_DESC, ARTI_DESCORTA, FADE_CANT, FADE_UNIDAD, FADE_FACTOR, BODE_COD, FADE_LOTE, LIPR_COD, FADE_PRUNIT, FADE_DTOPORC, FADE_DTOMONTO, FADE_IVAPORC, FADE_IVAMONTO, FADE_CONSUMO, FADE_TOTAL, FADE_REFERENCIA,
            GRUP_COD, SUBG_COD, MARC_COD, FABR_COD, ARTI_PESO, ARTI_ANCHO, ARTI_ALTO, ARTI_LARGO, fade_tiva, FADE_DEVUELTO, FADE_OBS, FADE_DTO1, FADE_DTO2, FADE_DTO3, FADE_DTOM1, FADE_DTOM2, FADE_DTOM3,
            FADE_CAJAS, FADE_BASE, FADE_PORCBASE, FADE_INALCM, FADE_INALCP, FADE_LLEVAR, ARTI_UNIDAD, ARTI_RESUNI, FADE_IDORI, FADE_PRECIOREF, fade_impba, fade_impupp, fade_impupm, fade_mandante
            FROM FACTURAS_DETALLE D, ARTICULO A
            WHERE D.ARTI_COD = A.ARTI_COD AND D.FACT_ID = :ID AND ((:TIPOFE <> 9) or ((D.ARTI_COD <> :artaiua) AND (D.ARTI_COD <> :artaiui) AND (D.ARTI_COD <> :artaiuu)))
            ORDER BY D.fade_desc
            INTO :ITEM, :ARTICULO, :CODBAR, :DESAUX, :DESCORTA, :CANT, :UNIDAD, :FACTOR, :BODITEM, :LOTE, :LISTAPR, :PRUNIT, :DTOITPORC, :DTOITMONTO, :IVAPORC, :IVAITMONTO, :CONSUMO, :TOTAL, :refitem,
            :GRUPO, :SUBGRUPO, :MARCA, :FABR, :PESO, :ANCHO, :ALTO, :LARGO, :TARIFA, :devuelto, :obsitem, :dtoit1, :dtoit2, :dtoit3, :dtoitem1, :dtoitem2, :dtoitem3,
            :cajas, :base, :porcbase, :INALC, :INALCP, :LLEVAR, :UNDPPAL, :undresaltar, :IDORI, :PRECIOREF, :itimpba, :itimpupp, :itimpupm, :mandante
            DO
              BEGIN
              vlote = null;
              if ((PROVTEC = 'DATAICO') OR (PROVTEC = 'FACTURATECH') or (PROVTEC = 'DIANSYSPLUS')) then
                execute procedure nombre_ascii(:DESAUX) returning_values(:artides);
              else
                artides = desaux;
              if (DTOIT1 IS NULL) then
                DTOIT1 = 0;
              if (DTOIT2 IS NULL) then
                DTOIT2 = 0;
              if (DTOIT3 IS NULL) then
                DTOIT3 = 0;
              if (DTOITEM1 IS NULL) then
                DTOITEM1 = 0;
              if (DTOITEM2 IS NULL) then
                DTOITEM2 = 0;
              if (DTOITEM3 IS NULL) then
                DTOITEM3 = 0;
              TOTDESCITEM = DTOITEM1 + DTOITEM2 + DTOITEM3;
              if (ARTICULO = CODBAR) then
                SELECT FIRST 1 COBA_COD FROM barras_articulo WHERE ARTI_COD = :articulo INTO :CODBAR;
              SELECT STAND_COD FROM STANDS WHERE ARTI_COD = :ARTICULO AND STAND_BODEGA = :boditem INTO :stand;
              if (UNDPPAL <> UNIDAD) THEN
                  select unar_resaltar from unidad_articulo where unar_unidad = :unidad and arti_cod = :articulo and unar_activa = 'S' into :undresaltar;
              if (UNDRESALTAR = 'S') then
                UNDRESALTAR = '*';
              ELSE
                UNDRESALTAR = '';
              if (LLEVAR = 'S') then
                LLEVAR = '*';
              ELSE
                LLEVAR = '';
              if (IMPRDEV <> 'SI') then
                BEGIN
                if ((CANT >= 0) AND (DEVUELTO < CANT*FACTOR)) then
                    IMPR = 'S';
                ELSE
                    if ((DEVUELTO > 0) or (CANT < 0))  then
                        if (EXISTS (SELECT FADE_ITEM FROM FACTURAS_DETALLE WHERE FADE_CANT = (:CANT*-1) AND FADE_UNIDAD = :UNIDAD AND FACT_ID = :ID AND ARTI_COD = :ARTICULO)) then
                            IMPR = 'N'; /* ES DEVOLUCION HECHA EN LA FACTURA */
                        ELSE
                            IMPR = 'S'; /* ES DEVOLUCION HECHA FUERA DE LA FACTURA */
                    ELSE
                        IMPR = 'S'; /* ITEM SIN DEVOLUCION */
                END
              ELSE
                IMPR = 'S';
              if (IMPR = 'S') then
                BEGIN
            EXECUTE procedure nombres_grupos_inventario (GRUPO, SUBGRUPO, MARCA, FABR)
                returning_values (NOMGRUPO, NOMSUBG, NOMMARCA, NOMFABR);
                if (CANT <> 0) then
                    prneto = (PRUNIT - DTOITMONTO) * ((100 - dtoit1)/100) * ((100-dtoit2)/100) * ((100-dtoit3)/100);
                ELSE
                    prneto = PRUNIT - DTOITMONTO;
                PRMAX = 0;
                SELECT PRAR_FIJO FROM PRECIOS_ARTICULO P
                    WHERE P.arti_cod = :articulo AND P.lipr_cod = :listapr INTO :PRMAX;
                PRMAX = PRMAX * FACTOR;
                if (PRREF = 'SI') then
                    AHORRO = (precioref - prneto) * cant;
                else
                    AHORRO = (:PRMAX - PRNETO) * CANT;
                if (ahorro < 0) then
                    ahorro = 0;
                TOTAHORRO = TOTAHORRO + AHORRO;
                if (IMPTOS = 'S') then
                    begin
                    if (cant <> 0) then
                        begin
                        if (INALC <> 0) then
                            prsiniva = (PRUNIT - (CONSUMO / CANT)) / ((100 + inalcp)/100);
                        else
                            prsiniva = (PRUNIT - (CONSUMO / CANT)) / ((100 + ivaporc)/100);
                        prnetosiniva = (PRUNIT - DTOITMONTO - ((IVAITMONTO + CONSUMO + INALC) / CANT));
                        prnetosiniva = prnetosiniva * ((100 - dtoit1)/100);
                        prnetosiniva = prnetosiniva * ((100-dtoit2)/100);
                        prnetosiniva = prnetosiniva * ((100-dtoit3)/100);
                        end
                    else
                        begin
                        prsiniva = PRUNIT - IVAITMONTO - CONSUMO - INALC;
                        prnetosiniva = PRUNIT - DTOITMONTO;
                        end
                    end
                else
                    begin
                    prsiniva = prunit;
                    prnetosiniva = PRUNIT - DTOITMONTO;
                    end
--            if (ICOINC <> 'SI') then
--                    SUBTOTIT = TOTAL - IVAITMONTO;
--                else
                    SUBTOTIT = TOTAL - IVAITMONTO - CONSUMO - INALC;
                SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
                if (extract(year from vlote) = 9999) then
                    vlote = null;
                if (ANCHO IS NULL) then
                    ANCHO = 0;
                if (ALTO IS NULL) then
                    ALTO = 0;
                if (LARGO IS NULL) then
                    LARGO = 0;
                if (PESO IS NULL) then
                    PESO = 0;
                if ((itimpba <> 0) AND (PESO <> 0)) then
                    begin
                    itimpbac = CANT * PESO;
                    itimpbau = CAST((:itimpba / (:CANT * :PESO / 100)) AS NUMERIC(18,2));
                    end 
                PESO = (PESO / 1000) * CANT * FACTOR;
                PESOTOT = PESOTOT + PESO;
                if (LEFT(ARTICULO,2) = '.t') then
                    BEGIN
                    REFITEM = '';
                    TOTAL = 0;
                    SUBTOTIT = 0;
                    ARTICULO = '';
                    CODBAR = '';
                    if (SUBSTRING(ARTIDES FROM 1 FOR 3) <> '***') then
                        ARTIDES = '*** ' || ARTIDES || ' ***';
                    END
                SELECT STAND_COD FROM STANDS WHERE ARTI_COD = :ARTICULO AND STAND_BODEGA = :boditem INTO :stand;
                factcant = NULL;
                SELECT FIRST 1 UNAR_FACCAN, UNAR_UNIDAD FROM unidad_articulo WHERE ARTI_COD = :articulo and unar_activa = 'S' and unar_faccan <= (:CANT * :FACTOR) AND UNAR_FACCAN >= 1
                    order by unar_faccan desc
                    INTO :factcant, :unialterna;
                if ((factcant IS NULL) or (factcant = 0)) then
                    BEGIN
                    ALTERNATIVAS = 0;
                    PRINCIPALES = (CANT * FACTOR);
                    SELECT ARTI_UNIDAD FROM ARTICULO WHERE ARTI_COD = :ARTICULO INTO :unialterna;
                    END
                ELSE
                    BEGIN
                    ALTERNATIVAS = FLOOR(CANT * factor / factcant);
                    PRINCIPALES = (CANT * FACTOR) - (alternativas * factcant);
                    if (ALTERNATIVAS = 0) then
                        SELECT ARTI_UNIDAD FROM ARTICULO WHERE ARTI_COD = :ARTICULO INTO :unialterna;
                    END
                if ((MONEDAEX = 'S') AND (TRM <> 1)) then
                    BEGIN
                    PRUNIT = PRUNIT / TRM;
                    prsiniva = prsiniva / TRM;
                    DTOITMONTO = DTOITMONTO / TRM;
                    PRNETO = PRNETO / TRM;
                    PRNETOSINIVA = PRNETOSINIVA / TRM;
                    BASE = base / TRM;
                    IVAITMONTO = IVAITMONTO / TRM;
                    CONSUMO = consumo / TRM;
                    INALC = INALC / TRM;
                    SUBTOTIT = SUBTOTIT / TRM;
                    TOTAL = TOTAL / TRM;
                    END
                EXECUTE PROCEDURE seriales_item_documento(31, :ID, :ITEM) returning_values (:SERIALES);
                if (OMITEREP = 'SI') then
                    if (ARTICULO = codanterior) then
                        BEGIN
                        codanterior = ARTICULO;
                        ARTICULO = '';
                        CODBAR = '';
                        ARTIDES = '';
                        DESCORTA = '';
                        END
                    ELSE
                        codanterior = ARTICULO;
                select VEND_NOMBRE from REMISIONES_VENTA P, VENDEDORES V where P.VEND_COD = V.VEND_COD AND REVT_ID = :IDORI into :NOMVENDREM;
                impbolsa = 0;
                if (ARTBOLSA = ARTICULO) then
                    BEGIN
                    impbolsa = CONSUMO;
                    CONSUMO = 0;
                    END
                SUSPEND;
                i = i + 1;
                /* el detalle si hubo ensamble */
                if (IMPRENS = 'SI') then
                  FOR SELECT '    ' || max(ed.arti_cod), SUM(ESDE_CANT*ENSA_CANT), SUM(ESDE_CANT), MAX(ESDE_LOTE), MAX(ESDE_UNIDAD), MAX(TAIV_PORC), '    ' || max(arti_des), MAX(ESDE_PRECIO)
                    FROM ENSAMBLES_DETALLE ED, ENSAMBLES E, articulo a, TARIFA_IVA T
                    WHERE E.ensa_tiporef = 31 AND E.ensa_idref = :id AND E.arti_cod = :articulo and a.arti_cod = ed.arti_cod
                    AND A.taiv_cod = T.taiv_cod and e.ensa_id = ed.ensa_id and e.ensa_itemref = :item
                    GROUP BY ED.ARTI_COD, ED.esde_unidad, ED.esde_lote
                    into :articulo, :cant, :cantens, :lote, :unidad, :ivaporc, :desaux, :prunit
                    do
                    begin
                    vlote = null;
                    if ((PROVTEC = 'DATAICO') OR (PROVTEC = 'FACTURATECH') or (PROVTEC = 'DIANSYSPLUS')) then
                        execute procedure nombre_ascii(:DESAUX) returning_values(:artides);
                    else
                        artides = desaux;
                    if (cantot = 'SI') then
                        CANT = cantens;
                    prnetosiniva = PRUNIT;
                    DTOITPORC = 0;
                    DTOITMONTO = 0;
                    IVAITMONTO = 0;
                    CONSUMO = 0;
                    itimpba = 0;
                    itimpupm = 0;
                    itimpupp = 0;
                    subtotit = 0;
                    TOTAL = 0;
                    SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
                    if (extract(year from vlote) = 9999) then
                        vlote = null;
                    SUSPEND;
                    end
                END
              END
      END
    ELSE
        BEGIN
        FOR SELECT FADE_ITEM, D.ARTI_COD, FADE_CODBAR, FADE_DESC, ARTI_DESCORTA, FADE_CANT, FADE_UNIDAD, FADE_FACTOR, BODE_COD, FADE_LOTE, LIPR_COD, FADE_PRUNIT, FADE_DTOPORC, FADE_DTOMONTO, FADE_IVAPORC, FADE_IVAMONTO, FADE_CONSUMO, FADE_TOTAL, FADE_REFERENCIA,
            GRUP_COD, SUBG_COD, MARC_COD, FABR_COD, ARTI_PESO, ARTI_ANCHO, ARTI_ALTO, ARTI_LARGO, fade_tiva, FADE_DEVUELTO, FADE_OBS, FADE_DTO1, FADE_DTO2, FADE_DTO3, FADE_DTOM1, FADE_DTOM2, FADE_DTOM3,
            FADE_CAJAS, FADE_BASE, FADE_PORCBASE, FADE_INALCM, FADE_INALCP, FADE_LLEVAR, ARTI_UNIDAD, ARTI_RESUNI, FADE_IDORI, FADE_PRECIOREF, fade_impba, fade_impupp, fade_impupm, fade_mandante
            FROM FACTURAS_DETALLE D, ARTICULO A
            WHERE D.ARTI_COD = A.ARTI_COD AND D.FACT_ID = :ID AND ((:TIPOFE <> 9) or ((D.ARTI_COD <> :artaiua) AND (D.ARTI_COD <> :artaiui) AND (D.ARTI_COD <> :artaiuu)))
            ORDER BY FADE_ITEM
            INTO :ITEM, :ARTICULO, :CODBAR, :desaux, :DESCORTA, :CANT, :UNIDAD, :FACTOR, :BODITEM, :LOTE, :LISTAPR, :PRUNIT, :DTOITPORC, :DTOITMONTO, :IVAPORC, :IVAITMONTO, :CONSUMO, :TOTAL, :refitem,
            :GRUPO, :SUBGRUPO, :MARCA, :FABR, :PESO, :ANCHO, :ALTO, :LARGO, :TARIFA, :devuelto, :obsitem, :dtoit1, :dtoit2, :dtoit3, :dtoitem1, :dtoitem2, :dtoitem3,
            :cajas, :base, :porcbase, :INALC, :INALCP, :LLEVAR, :UNDPPAL, :undresaltar, :IDORI, :PRECIOREF, :itimpba, :itimpupp, :itimpupm, :mandante
            DO
              BEGIN
              vlote = null;
              if ((PROVTEC = 'DATAICO') OR (PROVTEC = 'FACTURATECH') or (PROVTEC = 'DIANSYSPLUS')) then
                execute procedure nombre_ascii(:DESAUX) returning_values(:artides);
              else
                artides = desaux;
              if (DTOIT1 IS NULL) then
                DTOIT1 = 0;
              if (DTOIT2 IS NULL) then
                DTOIT2 = 0;
              if (DTOIT3 IS NULL) then
                DTOIT3 = 0;
              if (DTOITEM1 IS NULL) then
                DTOITEM1 = 0;
              if (DTOITEM2 IS NULL) then
                DTOITEM2 = 0;
              if (DTOITEM3 IS NULL) then
                DTOITEM3 = 0;
              TOTDESCITEM = DTOITEM1 + DTOITEM2 + DTOITEM3;
              if (UNDPPAL <> UNIDAD) THEN
                  select unar_resaltar from unidad_articulo where unar_unidad = :unidad and arti_cod = :articulo and unar_activa = 'S' into :undresaltar;
              if (UNDRESALTAR = 'S') then
                UNDRESALTAR = '*';
              ELSE
                UNDRESALTAR = '';
              if (LLEVAR = 'S') then
                LLEVAR = '*';
              ELSE
                LLEVAR = '';
              if (IMPRDEV <> 'SI') then
                BEGIN
                if ((CANT >= 0) AND (DEVUELTO < CANT*FACTOR)) then
                    IMPR = 'S';
                ELSE
                    if ((DEVUELTO > 0) or (CANT < 0))  then
                        if (EXISTS (SELECT FADE_ITEM FROM FACTURAS_DETALLE WHERE FADE_CANT = (:CANT*-1) AND FADE_UNIDAD = :UNIDAD AND FACT_ID = :ID AND ARTI_COD = :ARTICULO)) then
                            IMPR = 'N'; /* ES DEVOLUCION HECHA EN LA FACTURA */
                        ELSE
                            IMPR = 'S'; /* ES DEVOLUCION HECHA FUERA DE LA FACTURA */
                    ELSE
                        IMPR = 'S'; /* ITEM SIN DEVOLUCION */
                END
              ELSE
                IMPR = 'S';
              if (IMPR = 'S') then
                BEGIN
            EXECUTE procedure nombres_grupos_inventario (GRUPO, SUBGRUPO, MARCA, FABR)
                returning_values (NOMGRUPO, NOMSUBG, NOMMARCA, NOMFABR);
                if (CANT <> 0) then
                    prneto = (PRUNIT - DTOITMONTO) * ((100 - dtoit1)/100) * ((100-dtoit2)/100) * ((100-dtoit3)/100);
                ELSE
                    prneto = PRUNIT - DTOITMONTO;
                PRMAX = 0;
                SELECT PRAR_FIJO FROM PRECIOS_ARTICULO P
                    WHERE P.arti_cod = :articulo AND P.lipr_cod = :listapr INTO :PRMAX;
                PRMAX = PRMAX * FACTOR;
                if (PRREF = 'SI') then
                    AHORRO = (precioref - prneto) * cant;
                else
                    AHORRO = (:PRMAX - PRNETO) * CANT;
                if (ahorro < 0) then
                    ahorro = 0;
                TOTAHORRO = TOTAHORRO + AHORRO;
                if (IMPTOS = 'S') then
                    begin
                    if (cant <> 0) then
                        begin
                        if (INALC <> 0) then
                            prsiniva = (PRUNIT - (CONSUMO / CANT)) / ((100 + inalcp)/100);
                        else
                            prsiniva = (PRUNIT - (CONSUMO / CANT)) / ((100 + ivaporc)/100);
                        prnetosiniva = (PRUNIT - DTOITMONTO - ((IVAITMONTO + CONSUMO + INALC) / CANT));
                        prnetosiniva = prnetosiniva * ((100 - dtoit1)/100);
                        prnetosiniva = prnetosiniva * ((100-dtoit2)/100);
                        prnetosiniva = prnetosiniva * ((100-dtoit3)/100);
                        end
                    else
                        begin
                        prsiniva = PRUNIT - IVAITMONTO - CONSUMO - INALC;
                        prnetosiniva = PRUNIT - DTOITMONTO;
                        end
                    end
                else
                    begin
                    prsiniva = prunit;
                    prnetosiniva = PRUNIT - DTOITMONTO;
                    end
--                if (ICOINC <> 'SI') then
--                    SUBTOTIT = TOTAL - IVAITMONTO;
--                else
                    SUBTOTIT = TOTAL - IVAITMONTO - CONSUMO - INALC;
                SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
                if (extract(year from vlote) = 9999) then
                    vlote = null;
                if (ANCHO IS NULL) then
                    ANCHO = 0;
                if (ALTO IS NULL) then
                    ALTO = 0;
                if (LARGO IS NULL) then
                    LARGO = 0;
                if (PESO IS NULL) then
                    PESO = 0;
                if ((itimpba <> 0) AND (PESO <> 0)) then
                    begin
                    itimpbac = CANT * PESO;
                    itimpbau = CAST((:itimpba / (:CANT * :PESO / 100)) AS NUMERIC(18,2));
                    end 
                PESO = (PESO / 1000)* CANT * FACTOR;
                PESOTOT = PESOTOT + PESO;
                if (LEFT(ARTICULO,2) = '.t') then
                    BEGIN
                    REFITEM = '';
                    TOTAL = 0;
                    SUBTOTIT = 0;
                    ARTICULO = '';
                    CODBAR = '';
                    if (SUBSTRING(ARTIDES FROM 1 FOR 3) <> '***') then
                        ARTIDES = '*** ' || ARTIDES || ' ***';
                    END
                SELECT STAND_COD FROM STANDS WHERE ARTI_COD = :ARTICULO AND STAND_BODEGA = :boditem INTO :stand;
                factcant = NULL;
                SELECT FIRST 1 UNAR_FACCAN, UNAR_UNIDAD FROM unidad_articulo WHERE ARTI_COD = :articulo and unar_activa = 'S' and unar_faccan <= (:CANT * :FACTOR) AND UNAR_FACCAN >= 1
                    order by unar_faccan desc
                    INTO :factcant, :unialterna;
                if ((factcant IS NULL) or (factcant = 0)) then
                    BEGIN
                    ALTERNATIVAS = 0;
                    PRINCIPALES = (CANT * FACTOR);
                    SELECT ARTI_UNIDAD FROM ARTICULO WHERE ARTI_COD = :ARTICULO INTO :unialterna;
                    END
                ELSE
                    BEGIN
                    ALTERNATIVAS = FLOOR(CANT * factor / factcant);
                    PRINCIPALES = (CANT * FACTOR) - (alternativas * factcant);
                    if (ALTERNATIVAS = 0) then
                        SELECT ARTI_UNIDAD FROM ARTICULO WHERE ARTI_COD = :ARTICULO INTO :unialterna;
                    END
                if ((MONEDAEX = 'S') AND (TRM <> 1)) then
                    BEGIN
                    PRUNIT = PRUNIT / TRM;
                    prsiniva = prsiniva / TRM;
                    DTOITMONTO = DTOITMONTO / TRM;
                    PRNETO = PRNETO / TRM;
                    PRNETOSINIVA = PRNETOSINIVA / TRM;
                    BASE = base / TRM;
                    IVAITMONTO = IVAITMONTO / TRM;
                    CONSUMO = consumo / TRM;
                    INALC = INALC / TRM;
                    SUBTOTIT = SUBTOTIT / TRM;
                    TOTAL = TOTAL / TRM;
                    END
                EXECUTE PROCEDURE seriales_item_documento(31, :ID, :ITEM) returning_values (:SERIALES);
                if (OMITEREP = 'SI') then
                    if (ARTICULO = codanterior) then
                        BEGIN
                        codanterior = ARTICULO;
                        ARTICULO = '';
                        CODBAR = '';
                        ARTIDES = '';
                        DESCORTA = '';
                        END
                    ELSE
                        codanterior = ARTICULO;
                select VEND_NOMBRE from REMISIONES_VENTA P, VENDEDORES V where P.VEND_COD = V.VEND_COD AND REVT_ID = :IDORI into :NOMVENDREM;
                impbolsa = 0;
                if (ARTBOLSA = ARTICULO) then
                    BEGIN
                    impbolsa = CONSUMO;
                    CONSUMO = 0;
                    END
                SUSPEND;
                i = i + 1;
                /* el detalle si hubo ensamble */
                if (IMPRENS = 'SI') then
                  FOR SELECT '    ' || max(ed.arti_cod), SUM(ESDE_CANT*ENSA_CANT), SUM(ESDE_CANT), MAX(ESDE_LOTE), MAX(ESDE_UNIDAD), MAX(TAIV_PORC), '    ' || max(arti_des), MAX(ESDE_PRECIO)
                    FROM ENSAMBLES_DETALLE ED, ENSAMBLES E, articulo a, TARIFA_IVA T
                    WHERE E.ensa_tiporef = 31 AND E.ensa_idref = :id AND E.arti_cod = :articulo and a.arti_cod = ed.arti_cod
                    AND A.taiv_cod = T.taiv_cod and e.ensa_id = ed.ensa_id and e.ensa_itemref = :item
                    GROUP BY ED.ARTI_COD, ED.esde_unidad, ED.esde_lote
                    into :articulo, :cant, :cantens, :lote, :unidad, :ivaporc, :desaux, :prunit
                    do
                    begin
                    vlote = null;
                    if ((PROVTEC = 'DATAICO') OR (PROVTEC = 'FACTURATECH') or (PROVTEC = 'DIANSYSPLUS')) then
                        execute procedure nombre_ascii(:DESAUX) returning_values(:artides);
                    else
                        artides = desaux;
                    if (cantot = 'SI') then
                        CANT = cantens;
                    prnetosiniva = PRUNIT;
                    DTOITPORC = 0;
                    DTOITMONTO = 0;
                    IVAITMONTO = 0;
                    CONSUMO = 0;
                    itimpba = 0;
                    itimpupm = 0;
                    itimpupp = 0;
                    subtotit = 0;
                    TOTAL = 0;
                    SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
                    if (extract(year from vlote) = 9999) then
                        vlote = null;
                    SUSPEND;
                    end
                END
              END
        END
if (i = 0) then
    suspend;
END