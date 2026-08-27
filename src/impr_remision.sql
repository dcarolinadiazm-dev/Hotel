create or alter procedure IMPR_REMISION (
    ID integer)
returns (
    PREF varchar(4),
    NUMERO varchar(8),
    FECHA date,
    NIT varchar(20),
    NOMTERCERO varchar(60),
    SUCUR varchar(10),
    VENDEDOR integer,
    NOMVENDEDOR varchar(60),
    PUNTOVTA integer,
    NOMPUNTOVTA varchar(60),
    CODBODEGA varchar(2),
    NOMBODEGA varchar(30),
    COTIZACION varchar(30),
    PEDIDO varchar(30),
    FACTURA varchar(30),
    PENDIENTE varchar(30),
    SUBTOTAL numeric(18,2),
    IVAMONTO numeric(18,2),
    TOTIMPBA numeric(18,2),
    TOTIMPUP numeric(18,2),
    TOTALFAC numeric(18,2),
    DESPACHO varchar(255),
    TRANSPORTADOR varchar(60),
    OBS blob sub_type 1 segment size 80,
    NUMITEMS integer,
    PAGTOTAL integer,
    ITEM integer,
    ARTICULO varchar(15),
    CODBAR varchar(60),
    ARTIDES varchar(300),
    CANT numeric(18,4),
    LOTE varchar(50),
    VLOTE date,
    UNIDAD varchar(8),
    FACTOR numeric(18,4),
    CAJAS numeric(18,4),
    DEVUELTO numeric(18,4),
    CONSUMIDO numeric(18,4),
    LISTAPR integer,
    REFITEM varchar(60),
    BODITEM varchar(2),
    STAND varchar(20),
    SERIALES varchar(4096),
    PRUNIT numeric(18,2),
    DTOITPORC numeric(9,2),
    DTOITMONTO numeric(18,2),
    PRNETOSINIVA numeric(18,2),
    PRNETO numeric(18,2),
    IVAPORC numeric(9,2),
    IVAITMONTO numeric(18,2),
    CONSUMO numeric(18,2),
    ITIMPBA numeric(18,2),
    ITIMPUPP numeric(9,2),
    ITIMPUPM numeric(18,2),
    SUBTOTIT numeric(18,2),
    TOTAL numeric(18,2),
    PESOTOT numeric(18,4),
    CODIGOCL varchar(20),
    ZONACOD varchar(2),
    ZONANOM varchar(60),
    DV char(1),
    DIRECCION varchar(60),
    CIUDAD varchar(40),
    TELEFONO varchar(40),
    CONTACTO varchar(60),
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
    PESO numeric(9,4),
    ANCHO numeric(18,4),
    ALTO numeric(18,4),
    LARGO numeric(18,4),
    SUMA1 numeric(18,2),
    SUMA2 numeric(18,2),
    SUMA3 numeric(18,2),
    SUMA4 numeric(18,2),
    SUMA5 numeric(18,2),
    IVA1 numeric(18,2),
    IVA2 numeric(18,2),
    IVA3 numeric(18,2),
    IVA4 numeric(18,2),
    IVA5 numeric(18,2),
    SUMAEX numeric(18,2),
    SUMAGR numeric(18,2),
    TOTCAJAS numeric(18,2),
    VRFLETE numeric(18,2),
    VEHICULO varchar(15),
    OBSITEM blob sub_type 1 segment size 80,
    ALTERNATIVAS numeric(18,4),
    PRINCIPALES numeric(18,4),
    UNDRESALTAR char(1))
as
declare variable IMPTOS char(1);
declare variable TARIFA integer;
declare variable ORDENCOD char(15);
declare variable ICOINC char(2);
declare variable FACTCANT numeric(18,4);
declare variable ITEMFOR integer;
declare variable IMPRENS char(2);
declare variable CANTENS numeric(18,4);
declare variable CANTOT char(2);
BEGIN
execute procedure lee_configuracion('FACTURACION', 'ARTICULOS', 'IMPOCONSUMO INCLUIDO EN EL PRECIO BASE DE VENTA ANTES DE IVA') returning_values (icoinc);
EXECUTE PROCEDURE lee_configuracion ('FACTURACION','REMISIONES','ORDENAR ITEMS POR CODIGO DE ARTICULO') returning_values (:ORDENCOD);
EXECUTE PROCEDURE lee_configuracion ('FACTURACION','REMISIONES', 'IMPRIMIR DETALLE DE PRODUCTOS ENSAMBLADOS AUTOMATICAMENTE CON LA REMISION') returning_values (:imprens);
EXECUTE PROCEDURE LEE_CONFIGURACION('INVENTARIO', 'ENSAMBLES', 'FORMACIONES CON CANTIDADES TOTALES') returning_values (:CANTOT);
SELECT F.PREF_PRE, REVT_NUMERO, REVT_FECHA, F.BODE_COD, BODE_NOM, F.TERC_NIT, REVT_NOMTERC, F.VEND_COD, VEND_NOMBRE, F.PTVT_ID, PTVT_NOM,
    REVT_COTIZACI, REVT_PEDIDO, REVT_FACTURA, REVT_IVAINC,
    REVT_IVAMONTO, REVT_TOTAL, REVT_DESPACHO, REVT_TRANSP, REVT_VRFLETE, REVT_VEHICULO,
    TERC_CONTACTO, TERC_FAX, TERC_DV, TERC_CEL, REVT_OBS, REVT_SUCURSAL, REMI_PENDIENTE, revt_impba, revt_impup
    FROM REMISIONES_VENTA F, BODEGA B, VENDEDORES V, PUNTO_VENTA P, TERCEROS T
    WHERE F.BODE_COD = B.BODE_COD AND F.VEND_COD = V.VEND_COD AND F.PTVT_ID = P.PTVT_ID AND F.TERC_NIT = T.TERC_NIT AND F.REVT_ID = :ID
    into :PREF, :NUMERO, :FECHA, :CODBODEGA, :NOMBODEGA, :NIT, :NOMTERCERO, :VENDEDOR, :NOMVENDEDOR, :PUNTOVTA, :NOMPUNTOVTA,
    :COTIZACION, :PEDIDO, :FACTURA, :IMPTOS,
    :IVAMONTO, :TOTALFAC, :DESPACHO, :transportador, :vrflete, :vehiculo,
    :CONTACTO, :FAX, :DV, :CEL, :OBS, :SUCUR, :pendiente, :totimpba, :totimpup;
SUBTOTAL = TOTALFAC - IVAMONTO - totimpba - totimpup;

SELECT CLIE_COD, C.ZONA_COD, ZONA_NOM
    FROM CLIENTES C, ZONAS Z
    WHERE TERC_NIT = :NIT AND C.ZONA_COD = Z.ZONA_COD
    INTO :CODIGOCL, :ZONACOD, :ZONANOM;
SELECT CLSU_DIR, CLSU_CIUDAD, CLSU_TEL FROM CLIENTE_SUCURSALES WHERE TERC_NIT = :NIT AND CLCU_COD = :SUCUR
    INTO :DIRECCION, :CIUDAD, :TELEFONO;
SELECT COUNT(RVDE_ITEM) from remisiones_venta_detalle WHERE REVT_ID = :ID INTO :numitems;
SELECT FORM_NROITEMS FROM FORMATOS WHERE TIDO_COD = 32 AND PREF_PRE = :pref INTO :ITEMFOR;
if (ITEMFOR > 0) then
    pagtotal = CEIL(CAST(NUMITEMS AS DOUBLE PRECISION)/CAST(ITEMFOR AS DOUBLE PRECISION));
ELSE
    PAGTOTAL = 0;
    
SUMAEX = 0;
SUMA1 = 0;
SUMA2 = 0;
SUMA3 = 0;
SUMA4 = 0;
SUMA5 = 0;
IVA1 = 0;
IVA2 = 0;
IVA3 = 0;
IVA4 = 0;
IVA5 = 0;
ITEM = 0;
totcajas = 0;
PESOTOT = 0;
if (ORDENCOD = 'SI') then
    BEGIN
    FOR SELECT rvde_item, D.ARTI_COD, RVDE_CODBAR, RVDE_DESC, RVDE_CANT, RVDE_UNIDAD, BODE_COD, RVDE_LOTE, LIPR_COD, RVDE_PRUNIT, RVDE_DTOPORC, RVDE_DTOMONTO, RVDE_IVAPORC, RVDE_IVAMONTO, RVDE_CONSUMO, RVDE_TOTAL, RVDE_REFERENCIA,
        GRUP_COD, SUBG_COD, MARC_COD, FABR_COD, ARTI_PESO, ARTI_ANCHO, ARTI_ALTO, ARTI_LARGO, RVDE_TIVA, RVDE_DEVUELTO, RVDE_OBS, RVDE_CAJAS, RVDE_FACTOR, rvde_impba, rvde_impupp, rvde_impupm
        FROM REMISIONES_VENTA_DETALLE D, ARTICULO A
        WHERE D.ARTI_COD = A.ARTI_COD AND D.REVT_ID = :ID
        ORDER BY RVDE_CODBAR
        INTO :ITEM, :ARTICULO, :CODBAR, :ARTIDES, :CANT, :UNIDAD, :BODITEM, :LOTE, :LISTAPR, :PRUNIT, :DTOITPORC, :DTOITMONTO, :IVAPORC, :IVAITMONTO, :CONSUMO, :TOTAL, :refitem,
            :GRUPO, :SUBGRUPO, :MARCA, :FABR, :PESO, :ANCHO, :ALTO, :LARGO, :TARIFA, :DEVUELTO, :obsitem, :CAJAS, :FACTOR, :itimpba, :itimpupp, :itimpupm
        DO
        BEGIN
        if (ARTICULO = CODBAR) then
            SELECT FIRST 1 COBA_COD FROM barras_articulo WHERE ARTI_COD = :articulo INTO :CODBAR;
        EXECUTE procedure nombres_grupos_inventario (GRUPO, SUBGRUPO, MARCA, fabr)
            returning_values (NOMGRUPO, NOMSUBG, NOMMARCA, :nomfabr);
        select unar_resaltar from unidad_articulo where unar_unidad = :unidad and arti_cod = :articulo and unar_activa = 'S' into :undresaltar;
        if (UNDRESALTAR = 'S') then
          UNDRESALTAR = '*';
        ELSE
          UNDRESALTAR = '';
        VLOTE = NULL;
        if (LOTE <> '') then
            BEGIN
            SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
            if (extract(year from vlote) = 9999) then
                vlote = null;
            END
        if (ICOINC = 'SI') then
            SUBTOTIT = TOTAL - IVAITMONTO;
        else
            SUBTOTIT = TOTAL - IVAITMONTO - CONSUMO;
        CONSUMIDO = cant * factor - devuelto;
        PRNETO = PRUNIT - DTOITMONTO;
        if (PESO IS NULL) then
            PESO = 0;
        PESO = PESO / 1000 * CANT * FACTOR;
        PESOTOT = PESOTOT + PESO;
        if (IMPTOS = 'S') then
            if (cant <> 0) then
                prnetosiniva = PRUNIT - DTOITMONTO - ((IVAITMONTO+CONSUMO) / CANT);
            else
                prnetosiniva = PRUNIT - DTOITMONTO;
        ELSE
            prnetosiniva = PRUNIT - DTOITMONTO;
        if ((TARIFA = 0) AND (IVAPORC = 0)) then
            SUMAEX = SUMAEX + TOTAL;
        if (TARIFA = 1) then
            BEGIN
            SUMA1 = SUMA1 + TOTAL - IVAITMONTO;
            IVA1 = IVA1 + IVAITMONTO;
            END
        if (TARIFA = 2) then
            BEGIN
            SUMA2 = SUMA2 + TOTAL - IVAITMONTO;
            IVA2 = IVA2 + IVAITMONTO;
            END
        if (TARIFA = 3) then
            BEGIN
            SUMA3 = SUMA3 + TOTAL - IVAITMONTO;
            IVA3 = IVA3 + IVAITMONTO;
            END
        if (TARIFA = 4) then
            BEGIN
            SUMA4 = SUMA4 + TOTAL - IVAITMONTO;
            IVA4 = IVA4 + IVAITMONTO;
            END
        if (TARIFA = 5) then
            BEGIN
            SUMA5 = SUMA5 + TOTAL - IVAITMONTO;
            IVA5 = IVA5 + IVAITMONTO;
            END
        SUMAGR = 0;
        if (IVA1 <> 0) then
            SUMAGR = SUMAGR + SUMA1;
        if (IVA2 <> 0) then
            SUMAGR = SUMAGR + SUMA2;
        if (IVA3 <> 0) then
            SUMAGR = SUMAGR + SUMA3;
        if (IVA4 <> 0) then
            SUMAGR = SUMAGR + SUMA4;
        if (IVA5 <> 0) then
            SUMAGR = SUMAGR + SUMA5;

        totcajas = totcajas + cajas;
        SELECT STAND_COD FROM STANDS WHERE ARTI_COD = :ARTICULO AND STAND_BODEGA = :boditem INTO :stand;
        factcant = NULL;
        SELECT FIRST 1 UNAR_FACCAN FROM unidad_articulo WHERE ARTI_COD = :articulo INTO :factcant;
        if (factcant IS NULL) then
            factcant = 1;
        if ((factcant = 1) or (factcant = 0)) then
            BEGIN
            ALTERNATIVAS = 0;
            PRINCIPALES = (CANT * FACTOR);
            END
        ELSE
            BEGIN
            ALTERNATIVAS = FLOOR(CANT * factor / factcant);
            PRINCIPALES = (CANT * FACTOR) - (alternativas * factcant);
            END
        EXECUTE PROCEDURE seriales_item_documento(32, :ID, :ITEM) returning_values (:SERIALES);
        SUSPEND;
        /* el detalle si hubo ensamble */
        if (IMPRENS = 'SI') then
          FOR SELECT max(ed.arti_cod), SUM(ESDE_CANT*ESDE_FACTOR*ENSA_CANT), SUM(ESDE_CANT*ESDE_FACTOR), MAX(ESDE_LOTE), MAX(ARTI_UNIDAD), MAX(TAIV_PORC), '    ' || max(arti_des), MAX(ESDE_PRECIO)
            FROM ENSAMBLES_DETALLE ED, ENSAMBLES E, articulo a, TARIFA_IVA T
            WHERE E.ensa_tiporef = 32 AND E.ensa_idref = :id AND E.arti_cod = :articulo and a.arti_cod = ed.arti_cod
            AND A.taiv_cod = T.taiv_cod and e.ensa_id = ed.ensa_id and e.ensa_itemref = :item
            GROUP BY ED.ARTI_COD, ED.esde_lote
            into :articulo, :cant, :cantens, :lote, :unidad, :ivaporc, :artides, :prunit
            do
            begin
            SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
            if (extract(year from vlote) = 9999) then
                vlote = null;
            ARTICULO = ARTICULO || '    ';
            if (cantot = 'SI') then
                CANT = cantens;
            prnetosiniva = PRUNIT;
            DTOITPORC = 0;
            DTOITMONTO = 0;
            IVAITMONTO = 0;
            CONSUMO = 0;
            subtotit = 0;
            TOTAL = 0;
            SUSPEND;
            end
        END
    END
ELSE if (ORDENCOD = 'DESCRIPCION') then
    BEGIN
    FOR SELECT rvde_item, D.ARTI_COD, RVDE_CODBAR, RVDE_DESC, RVDE_CANT, RVDE_UNIDAD, BODE_COD, RVDE_LOTE, LIPR_COD, RVDE_PRUNIT, RVDE_DTOPORC, RVDE_DTOMONTO, RVDE_IVAPORC, RVDE_IVAMONTO, RVDE_CONSUMO, RVDE_TOTAL, RVDE_REFERENCIA,
        GRUP_COD, SUBG_COD, MARC_COD, FABR_COD, ARTI_PESO, ARTI_ANCHO, ARTI_ALTO, ARTI_LARGO, RVDE_TIVA, RVDE_DEVUELTO, RVDE_OBS, RVDE_CAJAS, RVDE_FACTOR, rvde_impba, rvde_impupp, rvde_impupm
        FROM REMISIONES_VENTA_DETALLE D, ARTICULO A
        WHERE D.ARTI_COD = A.ARTI_COD AND D.REVT_ID = :ID
        ORDER BY RVDE_DESC
        INTO :ITEM, :ARTICULO, :CODBAR, :ARTIDES, :CANT, :UNIDAD, :BODITEM, :LOTE, :LISTAPR, :PRUNIT, :DTOITPORC, :DTOITMONTO, :IVAPORC, :IVAITMONTO, :CONSUMO, :TOTAL, :refitem,
            :GRUPO, :SUBGRUPO, :MARCA, :FABR, :PESO, :ANCHO, :ALTO, :LARGO, :TARIFA, :DEVUELTO, :obsitem, :CAJAS, :FACTOR, :itimpba, :itimpupp, :itimpupm
        DO
        BEGIN
        if (ARTICULO = CODBAR) then
            SELECT FIRST 1 COBA_COD FROM barras_articulo WHERE ARTI_COD = :articulo INTO :CODBAR;
        EXECUTE procedure nombres_grupos_inventario (GRUPO, SUBGRUPO, MARCA, fabr)
            returning_values (NOMGRUPO, NOMSUBG, NOMMARCA, :nomfabr);
        select unar_resaltar from unidad_articulo where unar_unidad = :unidad and arti_cod = :articulo and unar_activa = 'S' into :undresaltar;
        if (UNDRESALTAR = 'S') then
          UNDRESALTAR = '*';
        ELSE
          UNDRESALTAR = '';
        VLOTE = NULL;
        if (LOTE <> '') then
            BEGIN
            SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
            if (extract(year from vlote) = 9999) then
                vlote = null;
            END
        if (ICOINC = 'SI') then
            SUBTOTIT = TOTAL - IVAITMONTO;
        else
            SUBTOTIT = TOTAL - IVAITMONTO - CONSUMO;
        CONSUMIDO = cant * factor - devuelto;
        PRNETO = PRUNIT - DTOITMONTO;
        if (PESO IS NULL) then
            PESO = 0;
        PESO = PESO / 1000 * CANT * FACTOR;
        PESOTOT = PESOTOT + PESO;
        if (IMPTOS = 'S') then
            if (cant <> 0) then
                prnetosiniva = PRUNIT - DTOITMONTO - ((IVAITMONTO+CONSUMO) / CANT);
            else
                prnetosiniva = PRUNIT - DTOITMONTO;
        ELSE
            prnetosiniva = PRUNIT - DTOITMONTO;
        if ((TARIFA = 0) AND (IVAPORC = 0)) then
            SUMAEX = SUMAEX + TOTAL;
        if (TARIFA = 1) then
            BEGIN
            SUMA1 = SUMA1 + TOTAL - IVAITMONTO;
            IVA1 = IVA1 + IVAITMONTO;
            END
        if (TARIFA = 2) then
            BEGIN
            SUMA2 = SUMA2 + TOTAL - IVAITMONTO;
            IVA2 = IVA2 + IVAITMONTO;
            END
        if (TARIFA = 3) then
            BEGIN
            SUMA3 = SUMA3 + TOTAL - IVAITMONTO;
            IVA3 = IVA3 + IVAITMONTO;
            END
        if (TARIFA = 4) then
            BEGIN
            SUMA4 = SUMA4 + TOTAL - IVAITMONTO;
            IVA4 = IVA4 + IVAITMONTO;
            END
        if (TARIFA = 5) then
            BEGIN
            SUMA5 = SUMA5 + TOTAL - IVAITMONTO;
            IVA5 = IVA5 + IVAITMONTO;
            END
        SUMAGR = 0;
        if (IVA1 <> 0) then
            SUMAGR = SUMAGR + SUMA1;
        if (IVA2 <> 0) then
            SUMAGR = SUMAGR + SUMA2;
        if (IVA3 <> 0) then
            SUMAGR = SUMAGR + SUMA3;
        if (IVA4 <> 0) then
            SUMAGR = SUMAGR + SUMA4;
        if (IVA5 <> 0) then
            SUMAGR = SUMAGR + SUMA5;

        totcajas = totcajas + cajas;
        SELECT STAND_COD FROM STANDS WHERE ARTI_COD = :ARTICULO AND STAND_BODEGA = :boditem INTO :stand;
        factcant = NULL;
        SELECT FIRST 1 UNAR_FACCAN FROM unidad_articulo WHERE ARTI_COD = :articulo INTO :factcant;
        if (factcant IS NULL) then
            factcant = 1;
        if ((factcant = 1) or (factcant = 0)) then
            BEGIN
            ALTERNATIVAS = 0;
            PRINCIPALES = (CANT * FACTOR);
            END
        ELSE
            BEGIN
            ALTERNATIVAS = FLOOR(CANT * factor / factcant);
            PRINCIPALES = (CANT * FACTOR) - (alternativas * factcant);
            END
        EXECUTE PROCEDURE seriales_item_documento(32, :ID, :ITEM) returning_values (:SERIALES);
        SUSPEND;
        /* el detalle si hubo ensamble */
        if (IMPRENS = 'SI') then
          FOR SELECT max(ed.arti_cod), SUM(ESDE_CANT*ESDE_FACTOR*ENSA_CANT), SUM(ESDE_CANT*ESDE_FACTOR), MAX(ESDE_LOTE), MAX(ARTI_UNIDAD), MAX(TAIV_PORC), '    ' || max(arti_des), MAX(ESDE_PRECIO)
            FROM ENSAMBLES_DETALLE ED, ENSAMBLES E, articulo a, TARIFA_IVA T
            WHERE E.ensa_tiporef = 32 AND E.ensa_idref = :id AND E.arti_cod = :articulo and a.arti_cod = ed.arti_cod
            AND A.taiv_cod = T.taiv_cod and e.ensa_id = ed.ensa_id and e.ensa_itemref = :item
            GROUP BY ED.ARTI_COD, ED.esde_lote
            into :articulo, :cant, :cantens, :lote, :unidad, :ivaporc, :artides, :prunit
            do
            begin
            SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
            if (extract(year from vlote) = 9999) then
                vlote = null;
            ARTICULO = ARTICULO || '    ';
            if (cantot = 'SI') then
                CANT = cantens;
            prnetosiniva = PRUNIT;
            DTOITPORC = 0;
            DTOITMONTO = 0;
            IVAITMONTO = 0;
            CONSUMO = 0;
            subtotit = 0;
            TOTAL = 0;
            SUSPEND;
            end
        END
    END
ELSE
  if (ORDENCOD = 'UNIDAD') then
    BEGIN
    FOR SELECT rvde_item, D.ARTI_COD, RVDE_CODBAR, RVDE_DESC, RVDE_CANT, RVDE_UNIDAD, BODE_COD, RVDE_LOTE, LIPR_COD, RVDE_PRUNIT, RVDE_DTOPORC, RVDE_DTOMONTO, RVDE_IVAPORC, RVDE_IVAMONTO, RVDE_CONSUMO, RVDE_TOTAL, RVDE_REFERENCIA,
        GRUP_COD, SUBG_COD, MARC_COD, FABR_COD, ARTI_PESO, ARTI_ANCHO, ARTI_ALTO, ARTI_LARGO, RVDE_TIVA, RVDE_DEVUELTO, RVDE_OBS, RVDE_CAJAS, RVDE_FACTOR, rvde_impba, rvde_impupp, rvde_impupm
        FROM REMISIONES_VENTA_DETALLE D, ARTICULO A
        WHERE D.ARTI_COD = A.ARTI_COD AND D.REVT_ID = :ID
        ORDER BY RVDE_CODBAR
        INTO :ITEM, :ARTICULO, :CODBAR, :ARTIDES, :CANT, :UNIDAD, :BODITEM, :LOTE, :LISTAPR, :PRUNIT, :DTOITPORC, :DTOITMONTO, :IVAPORC, :IVAITMONTO, :CONSUMO, :TOTAL, :refitem,
            :GRUPO, :SUBGRUPO, :MARCA, :FABR, :PESO, :ANCHO, :ALTO, :LARGO, :TARIFA, :DEVUELTO, :obsitem, :CAJAS, :FACTOR, :itimpba, :itimpupp, :itimpupm
        DO
        BEGIN
        if (ARTICULO = CODBAR) then
            SELECT FIRST 1 COBA_COD FROM barras_articulo WHERE ARTI_COD = :articulo INTO :CODBAR;
        EXECUTE procedure nombres_grupos_inventario (GRUPO, SUBGRUPO, MARCA, fabr)
            returning_values (NOMGRUPO, NOMSUBG, NOMMARCA, :nomfabr);
        select unar_resaltar from unidad_articulo where unar_unidad = :unidad and arti_cod = :articulo and unar_activa = 'S' into :undresaltar;
        if (UNDRESALTAR = 'S') then
          UNDRESALTAR = '*';
        ELSE
          UNDRESALTAR = '';
        VLOTE = NULL;
        if (LOTE <> '') then
            BEGIN
            SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
            if (extract(year from vlote) = 9999) then
                vlote = null;
            END
        if (ICOINC = 'SI') then
            SUBTOTIT = TOTAL - IVAITMONTO;
        else
            SUBTOTIT = TOTAL - IVAITMONTO - CONSUMO;
        CONSUMIDO = cant * factor - devuelto;
        PRNETO = PRUNIT - DTOITMONTO;
        if (PESO IS NULL) then
            PESO = 0;
        PESO = PESO / 1000 * CANT * FACTOR;
        PESOTOT = PESOTOT + PESO;
        if (IMPTOS = 'S') then
            if (cant <> 0) then
                prnetosiniva = PRUNIT - DTOITMONTO - ((IVAITMONTO+CONSUMO) / CANT);
            else
                prnetosiniva = PRUNIT - DTOITMONTO;
        ELSE
            prnetosiniva = PRUNIT - DTOITMONTO;
        if ((TARIFA = 0) AND (IVAPORC = 0)) then
            SUMAEX = SUMAEX + TOTAL;
        if (TARIFA = 1) then
            BEGIN
            SUMA1 = SUMA1 + TOTAL - IVAITMONTO;
            IVA1 = IVA1 + IVAITMONTO;
            END
        if (TARIFA = 2) then
            BEGIN
            SUMA2 = SUMA2 + TOTAL - IVAITMONTO;
            IVA2 = IVA2 + IVAITMONTO;
            END
        if (TARIFA = 3) then
            BEGIN
            SUMA3 = SUMA3 + TOTAL - IVAITMONTO;
            IVA3 = IVA3 + IVAITMONTO;
            END
        if (TARIFA = 4) then
            BEGIN
            SUMA4 = SUMA4 + TOTAL - IVAITMONTO;
            IVA4 = IVA4 + IVAITMONTO;
            END
        if (TARIFA = 5) then
            BEGIN
            SUMA5 = SUMA5 + TOTAL - IVAITMONTO;
            IVA5 = IVA5 + IVAITMONTO;
            END
        SUMAGR = 0;
        if (IVA1 <> 0) then
            SUMAGR = SUMAGR + SUMA1;
        if (IVA2 <> 0) then
            SUMAGR = SUMAGR + SUMA2;
        if (IVA3 <> 0) then
            SUMAGR = SUMAGR + SUMA3;
        if (IVA4 <> 0) then
            SUMAGR = SUMAGR + SUMA4;
        if (IVA5 <> 0) then
            SUMAGR = SUMAGR + SUMA5;

        totcajas = totcajas + cajas;
        SELECT STAND_COD FROM STANDS WHERE ARTI_COD = :ARTICULO AND STAND_BODEGA = :boditem INTO :stand;
        factcant = NULL;
        SELECT FIRST 1 UNAR_FACCAN FROM unidad_articulo WHERE ARTI_COD = :articulo INTO :factcant;
        if (factcant IS NULL) then
            factcant = 1;
        if ((factcant = 1) or (factcant = 0)) then
            BEGIN
            ALTERNATIVAS = 0;
            PRINCIPALES = (CANT * FACTOR);
            END
        ELSE
            BEGIN
            ALTERNATIVAS = FLOOR(CANT * factor / factcant);
            PRINCIPALES = (CANT * FACTOR) - (alternativas * factcant);
            END
        EXECUTE PROCEDURE seriales_item_documento(32, :ID, :ITEM) returning_values (:SERIALES);
        SUSPEND;
        /* el detalle si hubo ensamble */
        if (IMPRENS = 'SI') then
          FOR SELECT max(ed.arti_cod), SUM(ESDE_CANT*ESDE_FACTOR*ENSA_CANT), SUM(ESDE_CANT*ESDE_FACTOR), MAX(ESDE_LOTE), MAX(ARTI_UNIDAD), MAX(TAIV_PORC), '    ' || max(arti_des), MAX(ESDE_PRECIO)
            FROM ENSAMBLES_DETALLE ED, ENSAMBLES E, articulo a, TARIFA_IVA T
            WHERE E.ensa_tiporef = 32 AND E.ensa_idref = :id AND E.arti_cod = :articulo and a.arti_cod = ed.arti_cod
            AND A.taiv_cod = T.taiv_cod and e.ensa_id = ed.ensa_id and e.ensa_itemref = :item
            GROUP BY ED.ARTI_COD, ED.esde_lote
            into :articulo, :cant, :cantens, :lote, :unidad, :ivaporc, :artides, :prunit
            do
            begin
            SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
            if (extract(year from vlote) = 9999) then
                vlote = null;
            ARTICULO = ARTICULO || '    ';
            if (cantot = 'SI') then
                CANT = cantens;
            prnetosiniva = PRUNIT;
            DTOITPORC = 0;
            DTOITMONTO = 0;
            IVAITMONTO = 0;
            CONSUMO = 0;
            subtotit = 0;
            TOTAL = 0;
            SUSPEND;
            end
        END
    END
  ELSE
      if (ORDENCOD = 'STAND') then
        BEGIN
        FOR SELECT rvde_item, D.ARTI_COD, RVDE_CODBAR, RVDE_DESC, RVDE_CANT, RVDE_UNIDAD, BODE_COD, RVDE_LOTE, LIPR_COD, RVDE_PRUNIT, RVDE_DTOPORC, RVDE_DTOMONTO, RVDE_IVAPORC, RVDE_IVAMONTO, RVDE_CONSUMO, RVDE_TOTAL, RVDE_REFERENCIA,
            GRUP_COD, SUBG_COD, MARC_COD, FABR_COD, ARTI_PESO, ARTI_ANCHO, ARTI_ALTO, ARTI_LARGO, RVDE_TIVA, RVDE_DEVUELTO, RVDE_OBS, RVDE_CAJAS, RVDE_FACTOR, STAND_COD, rvde_impba, rvde_impupp, rvde_impupm
            FROM REMISIONES_VENTA_DETALLE D, ARTICULO A, STANDS S
            WHERE D.ARTI_COD = A.ARTI_COD AND D.REVT_ID = :ID AND A.arti_cod = S.arti_cod AND S.stand_bodega = D.bode_cod
            ORDER BY D.bode_cod, S.stand_cod, D.rvde_desc
            INTO :ITEM, :ARTICULO, :CODBAR, :ARTIDES, :CANT, :UNIDAD, :BODITEM, :LOTE, :LISTAPR, :PRUNIT, :DTOITPORC, :DTOITMONTO, :IVAPORC, :IVAITMONTO, :CONSUMO, :TOTAL, :refitem,
                :GRUPO, :SUBGRUPO, :MARCA, :FABR, :PESO, :ANCHO, :ALTO, :LARGO, :TARIFA, :DEVUELTO, :obsitem, :CAJAS, :FACTOR, :stand, :itimpba, :itimpupp, :itimpupm
            DO
            BEGIN
            if (ARTICULO = CODBAR) then
                SELECT FIRST 1 COBA_COD FROM barras_articulo WHERE ARTI_COD = :articulo INTO :CODBAR;
            EXECUTE procedure nombres_grupos_inventario (GRUPO, SUBGRUPO, MARCA, fabr)
                returning_values (NOMGRUPO, NOMSUBG, NOMMARCA, :nomfabr);
            select unar_resaltar from unidad_articulo where unar_unidad = :unidad and arti_cod = :articulo and unar_activa = 'S' into :undresaltar;
            if (UNDRESALTAR = 'S') then
              UNDRESALTAR = '*';
            ELSE
              UNDRESALTAR = '';
            VLOTE = NULL;
            if (LOTE <> '') then
                BEGIN
                SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
                if (extract(year from vlote) = 9999) then
                    vlote = null;
                END
            if (ICOINC = 'SI') then
                SUBTOTIT = TOTAL - IVAITMONTO;
            else
                SUBTOTIT = TOTAL - IVAITMONTO - CONSUMO;
            CONSUMIDO = cant * factor - devuelto;
            PRNETO = PRUNIT - DTOITMONTO;
            if (PESO IS NULL) then
                PESO = 0;
            PESO = PESO / 1000 * CANT * FACTOR;
            PESOTOT = PESOTOT + PESO;
            if (IMPTOS = 'S') then
                if (cant <> 0) then
                    prnetosiniva = PRUNIT - DTOITMONTO - ((IVAITMONTO+CONSUMO) / CANT);
                else
                    prnetosiniva = PRUNIT - DTOITMONTO;
            ELSE
                prnetosiniva = PRUNIT - DTOITMONTO;
            if ((TARIFA = 0) AND (IVAPORC = 0)) then
                SUMAEX = SUMAEX + TOTAL;
            if (TARIFA = 1) then
                BEGIN
                SUMA1 = SUMA1 + TOTAL - IVAITMONTO;
                IVA1 = IVA1 + IVAITMONTO;
                END
            if (TARIFA = 2) then
                BEGIN
                SUMA2 = SUMA2 + TOTAL - IVAITMONTO;
                IVA2 = IVA2 + IVAITMONTO;
                END
            if (TARIFA = 3) then
                BEGIN
                SUMA3 = SUMA3 + TOTAL - IVAITMONTO;
                IVA3 = IVA3 + IVAITMONTO;
                END
            if (TARIFA = 4) then
                BEGIN
                SUMA4 = SUMA4 + TOTAL - IVAITMONTO;
                IVA4 = IVA4 + IVAITMONTO;
                END
            if (TARIFA = 5) then
                BEGIN
                SUMA5 = SUMA5 + TOTAL - IVAITMONTO;
                IVA5 = IVA5 + IVAITMONTO;
                END
            SUMAGR = 0;
            if (IVA1 <> 0) then
                SUMAGR = SUMAGR + SUMA1;
            if (IVA2 <> 0) then
                SUMAGR = SUMAGR + SUMA2;
            if (IVA3 <> 0) then
                SUMAGR = SUMAGR + SUMA3;
            if (IVA4 <> 0) then
                SUMAGR = SUMAGR + SUMA4;
            if (IVA5 <> 0) then
                SUMAGR = SUMAGR + SUMA5;
    
            totcajas = totcajas + cajas;
            factcant = NULL;
            SELECT FIRST 1 UNAR_FACCAN FROM unidad_articulo WHERE ARTI_COD = :articulo INTO :factcant;
            if (factcant IS NULL) then
                factcant = 1;
            if ((factcant = 1) or (factcant = 0)) then
                BEGIN
                ALTERNATIVAS = 0;
                PRINCIPALES = (CANT * FACTOR);
                END
            ELSE
                BEGIN
                ALTERNATIVAS = FLOOR(CANT * factor / factcant);
                PRINCIPALES = (CANT * FACTOR) - (alternativas * factcant);
                END
            EXECUTE PROCEDURE seriales_item_documento(32, :ID, :ITEM) returning_values (:SERIALES);
            SUSPEND;
            /* el detalle si hubo ensamble */
            if (IMPRENS = 'SI') then
              FOR SELECT max(ed.arti_cod), SUM(ESDE_CANT*ESDE_FACTOR*ENSA_CANT), SUM(ESDE_CANT*ESDE_FACTOR), MAX(ESDE_LOTE), MAX(ARTI_UNIDAD), MAX(TAIV_PORC), '    ' || max(arti_des), MAX(ESDE_PRECIO)
                FROM ENSAMBLES_DETALLE ED, ENSAMBLES E, articulo a, TARIFA_IVA T
                WHERE E.ensa_tiporef = 32 AND E.ensa_idref = :id AND E.arti_cod = :articulo and a.arti_cod = ed.arti_cod
                AND A.taiv_cod = T.taiv_cod and e.ensa_id = ed.ensa_id and e.ensa_itemref = :item
                GROUP BY ED.ARTI_COD, ED.esde_lote
                into :articulo, :cant, :cantens, :lote, :unidad, :ivaporc, :artides, :prunit
                do
                begin
                SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
                if (extract(year from vlote) = 9999) then
                    vlote = null;
                ARTICULO = ARTICULO || '    ';
                if (cantot = 'SI') then
                    CANT = cantens;
                prnetosiniva = PRUNIT;
                DTOITPORC = 0;
                DTOITMONTO = 0;
                IVAITMONTO = 0;
                CONSUMO = 0;
                subtotit = 0;
                TOTAL = 0;
                SUSPEND;
                end
            END
        END
      ELSE
        BEGIN
        FOR SELECT RVDE_ITEM, D.ARTI_COD, RVDE_CODBAR, RVDE_DESC, RVDE_CANT, RVDE_UNIDAD, BODE_COD, RVDE_LOTE, LIPR_COD, RVDE_PRUNIT, RVDE_DTOPORC, RVDE_DTOMONTO, RVDE_IVAPORC, RVDE_IVAMONTO, RVDE_CONSUMO, RVDE_TOTAL, RVDE_REFERENCIA,
            GRUP_COD, SUBG_COD, MARC_COD, FABR_COD, ARTI_PESO, ARTI_ANCHO, ARTI_ALTO, ARTI_LARGO, RVDE_TIVA, RVDE_DEVUELTO, RVDE_OBS, RVDE_CAJAS, RVDE_FACTOR, rvde_impba, rvde_impupp, rvde_impupm
            FROM REMISIONES_VENTA_DETALLE D, ARTICULO A
            WHERE D.ARTI_COD = A.ARTI_COD AND D.REVT_ID = :ID
            ORDER BY RVDE_ITEM
            INTO :ITEM, :ARTICULO, :CODBAR, :ARTIDES, :CANT, :UNIDAD, :BODITEM, :LOTE, :LISTAPR, :PRUNIT, :DTOITPORC, :DTOITMONTO, :IVAPORC, :IVAITMONTO, :CONSUMO, :TOTAL, :refitem,
                :GRUPO, :SUBGRUPO, :MARCA, :FABR, :PESO, :ANCHO, :ALTO, :LARGO, :TARIFA, :DEVUELTO, :obsitem, :CAJAS, :FACTOR, :itimpba, :itimpupp, :itimpupm
            DO
            BEGIN
            EXECUTE procedure nombres_grupos_inventario (GRUPO, SUBGRUPO, MARCA, fabr)
                returning_values (NOMGRUPO, NOMSUBG, NOMMARCA, :nomfabr);
            select unar_resaltar from unidad_articulo where unar_unidad = :unidad and arti_cod = :articulo and unar_activa = 'S' into :undresaltar;
            if (UNDRESALTAR = 'S') then
              UNDRESALTAR = '*';
            ELSE
              UNDRESALTAR = '';
            VLOTE = NULL;
            if (LOTE <> '') then
                BEGIN
                SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
                if (extract(year from vlote) = 9999) then
                    vlote = null;
                END
            if (ICOINC = 'SI') then
                SUBTOTIT = TOTAL - IVAITMONTO;
            else
                SUBTOTIT = TOTAL - IVAITMONTO - CONSUMO;
            CONSUMIDO = cant * factor - devuelto;
            PRNETO = PRUNIT - DTOITMONTO;
            if (PESO IS NULL) then
                PESO = 0;
            PESO = PESO / 1000 * CANT * FACTOR;
            PESOTOT = PESOTOT + PESO;
            if (IMPTOS = 'S') then
                if (cant <> 0) then
                    prnetosiniva = PRUNIT - DTOITMONTO - ((IVAITMONTO+CONSUMO) / CANT);
                else
                    prnetosiniva = PRUNIT - DTOITMONTO;
            ELSE
                prnetosiniva = PRUNIT - DTOITMONTO;
            if ((TARIFA = 0) AND (IVAPORC = 0)) then
                SUMAEX = SUMAEX + TOTAL;
            if (TARIFA = 1) then
                BEGIN
                SUMA1 = SUMA1 + TOTAL - IVAITMONTO;
                IVA1 = IVA1 + IVAITMONTO;
                END
            if (TARIFA = 2) then
                BEGIN
                SUMA2 = SUMA2 + TOTAL - IVAITMONTO;
                IVA2 = IVA2 + IVAITMONTO;
                END
            if (TARIFA = 3) then
                BEGIN
                SUMA3 = SUMA3 + TOTAL - IVAITMONTO;
                IVA3 = IVA3 + IVAITMONTO;
                END
            if (TARIFA = 4) then
                BEGIN
                SUMA4 = SUMA4 + TOTAL - IVAITMONTO;
                IVA4 = IVA4 + IVAITMONTO;
                END
            if (TARIFA = 5) then
                BEGIN
                SUMA5 = SUMA5 + TOTAL - IVAITMONTO;
                IVA5 = IVA5 + IVAITMONTO;
                END
            SUMAGR = 0;
            if (IVA1 <> 0) then
                SUMAGR = SUMAGR + SUMA1;
            if (IVA2 <> 0) then
                SUMAGR = SUMAGR + SUMA2;
            if (IVA3 <> 0) then
                SUMAGR = SUMAGR + SUMA3;
            if (IVA4 <> 0) then
                SUMAGR = SUMAGR + SUMA4;
            if (IVA5 <> 0) then
                SUMAGR = SUMAGR + SUMA5;
            totcajas = totcajas + cajas;
            SELECT STAND_COD FROM STANDS WHERE ARTI_COD = :ARTICULO AND STAND_BODEGA = :boditem INTO :stand;
            factcant = NULL;
            SELECT FIRST 1 UNAR_FACCAN FROM unidad_articulo WHERE ARTI_COD = :articulo INTO :factcant;
            if (factcant IS NULL) then
                factcant = 1;
            if ((factcant = 1) or (factcant = 0)) then
                BEGIN
                ALTERNATIVAS = 0;
                PRINCIPALES = (CANT * FACTOR);
                END
            ELSE
                BEGIN
                ALTERNATIVAS = FLOOR(CANT * factor / factcant);
                PRINCIPALES = (CANT * FACTOR) - (alternativas * factcant);
                END
            EXECUTE PROCEDURE seriales_item_documento(32, :ID, :ITEM) returning_values (:SERIALES);
            SUSPEND;
            /* el detalle si hubo ensamble */
            if (IMPRENS = 'SI') then
              FOR SELECT max(ed.arti_cod), SUM(ESDE_CANT*ESDE_FACTOR*ENSA_CANT), SUM(ESDE_CANT*ESDE_FACTOR), MAX(ESDE_LOTE), MAX(ARTI_UNIDAD), MAX(TAIV_PORC), '    ' || max(arti_des), MAX(ESDE_PRECIO)
                FROM ENSAMBLES_DETALLE ED, ENSAMBLES E, articulo a, TARIFA_IVA T
                WHERE E.ensa_tiporef = 32 AND E.ensa_idref = :id AND E.arti_cod = :articulo and a.arti_cod = ed.arti_cod
                AND A.taiv_cod = T.taiv_cod and e.ensa_id = ed.ensa_id and e.ensa_itemref = :item
                GROUP BY ED.ARTI_COD, ED.esde_lote
                into :articulo, :cant, :cantens, :lote, :unidad, :ivaporc, :artides, :prunit
                do
                begin
                SELECT LOTE_VENCE FROM LOTES WHERE LOTE_NRO = :lote AND ARTI_COD = :ARTICULO AND BODE_COD = :boditem INTO :vlote;
                if (extract(year from vlote) = 9999) then
                    vlote = null;
                ARTICULO = ARTICULO || '    ';
                if (cantot = 'SI') then
                    CANT = cantens;
                prnetosiniva = PRUNIT;
                DTOITPORC = 0;
                DTOITMONTO = 0;
                IVAITMONTO = 0;
                CONSUMO = 0;
                subtotit = 0;
                TOTAL = 0;
                SUSPEND;
                end
            END
        END
END