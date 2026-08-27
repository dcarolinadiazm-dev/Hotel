create or alter procedure REP_CARTERA_CONSOLIDADA (
    DESDE varchar(20),
    HASTA varchar(20),
    GRPINI varchar(5),
    GRPFIN varchar(5),
    COBINI integer,
    COBFIN integer,
    FECHA date,
    ORDEN char(1),
    AGRUPA char(1),
    SUBEMPRESA integer,
    GRUPCART integer,
    DIFCAMBIO char(1),
    MONEDA integer)
returns (
    NIT varchar(20),
    NOMBRE varchar(60),
    TELEFONO varchar(40),
    CIUDAD varchar(40),
    EMAIL varchar(100),
    MAILCART varchar(100),
    FAX varchar(25),
    CEL varchar(25),
    CODCLI varchar(20),
    CODZONA varchar(3),
    NOMZONA varchar(60),
    CODSUBZ varchar(3),
    NOMSUBZ varchar(60),
    CODCANA integer,
    NOMCANA varchar(60),
    CODSUBC integer,
    NOMSUBC varchar(60),
    CODCOBR integer,
    NOMCOBR varchar(60),
    SUCURSAL varchar(10),
    DV varchar(2),
    CODCIUD char(5),
    NOMCIUD varchar(60),
    SALDO numeric(18,2),
    RTFTE numeric(18,2),
    RTIVA numeric(18,2),
    RTICA numeric(18,2),
    RCREE numeric(18,2),
    DTOF numeric(18,2),
    DIFCMB numeric(18,2),
    SALDOME numeric(18,2),
    CUPO numeric(18,2),
    DISPONIBLE numeric(18,2),
    PROVISIONAL numeric(18,2),
    CONTACTO varchar(60),
    ESTADO char(1),
    RESALTAR char(1),
    DIASBL integer,
    DIAS integer,
    INSTCART varchar(255),
    GRUPCOD integer,
    GRUPNOM varchar(30))
as
declare variable FOV char(11);
declare variable NITINI varchar(20);
declare variable NITFIN varchar(20);
declare variable NOMINI varchar(20);
declare variable NOMFIN varchar(20);
declare variable VENCE date;
declare variable OK char(1);
declare variable PSALDO numeric(18,2);
declare variable PSALDOME numeric(18,2);
declare variable PDIFCMB numeric(18,2);
declare variable PRTFTE numeric(18,2);
declare variable PRTIVA numeric(18,2);
declare variable PRTICA numeric(18,2);
declare variable PRCREE numeric(18,2);
declare variable PDTOF numeric(18,2);
declare variable TIPO integer;
declare variable ID integer;
declare variable DTOAPL numeric(18,2);
declare variable FECDTO date;
declare variable DESCNT_PROV char(2);
declare variable AUTORET varchar(10);
declare variable FAUTORET date;
declare variable FECDOC date;
declare variable INCLANTI char(2);
declare variable TRM numeric(18,2);
declare variable AUTORCREE varchar(10);
declare variable FAUTORCREE date;
declare variable DIASDOC integer;
declare variable TIPOMON integer;
declare variable TRMHOY numeric(18,2);
BEGIN
execute procedure LEE_CONFIGURACION('CARTERA', 'SALDOS', 'ANALISIS DE CARTERA CON FECHA FACTURA, VENCIMIENTO O ENTREGA') returning_values (FOV);
if (ORDEN = 'C') then
    BEGIN
    NITINI = DESDE;
    NITFIN = HASTA;
    NOMINI = '';
    NOMFIN = 'zz';
    END
ELSE
    BEGIN
    NOMINI = DESDE;
    NOMFIN = HASTA;
    NITINI = '';
    NITFIN = 'zz';
    END
EXECUTE PROCEDURE LEE_CONFIGURACION('CARTERA', 'SALDOS', 'DESCONTAR RECIBOS PROVISIONALES EN INFORMES DE CARTERA') RETURNING_VALUES (:descnt_prov);
EXECUTE PROCEDURE LEE_CONFIGURACION('CARTERA', 'SALDOS', 'INCLUIR ANTICIPOS DE CLIENTES EN REPORTES Y CONSULTAS DE CARTERA') returning_values (INCLANTI);
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
/* Ubique el NIT */
FOR select C.TERC_NIT, CLSU_NOMBRE, TERC_DV, CLSU_TEL, CLSU_CIUDAD, TERC_CONTACTO, S.COBR_COD, S.ZONA_ID, S.subz_cod, T.CIUD_COD, CLIE_CUPO, CLIE_ESTADO,
    CLCU_COD, C.GRCA_COD, TERC_EMAIL, TERC_FAX, TERC_CEL, CLIE_COD, CLIE_RESALTAR, CLIE_INSTCARTERA, CLIE_MAILCART, C.clie_canal, C.clie_subcanal, CLIE_DIASBLOQ
    from terceros T, CLIENTES C, CLIENTE_SUCURSALES S
    where C.TERC_NIT = T.TERC_NIT AND TERC_CLIE = 'S' AND S.TERC_NIT = C.TERC_NIT AND C.TERC_NIT >= :NITINI AND C.TERC_NIT <= :NITFIN AND
        TERC_NOM >= :NOMINI AND TERC_NOM <= :NOMFIN AND ((:GRUPCART = 0) or (C.GRCA_COD = :GRUPCART))
    INTO :NIT, :NOMBRE, :DV, :TELEFONO, :CIUDAD, :CONTACTO, :CODCOBR, :CODZONA, :CODSUBZ, :CODCIUD, :CUPO, :ESTADO,
    :SUCURSAL, :GRUPCOD, :EMAIL, :FAX, :CEL, :CODCLI, :RESALTAR, :INSTCART, :MAILCART, :codcana, :codsubc, :diasbl
    DO  
    BEGIN
    SELECT GRCA_NOMBRE FROM GRUPO_CARTERA WHERE GRCA_COD = :GRUPCOD INTO :GRUPNOM;
    OK = 'N';
    if ((AGRUPA = 'Z') or (AGRUPA = 'N')) then
        BEGIN
        if (GRPINI = '') then
            BEGIN
            if (grpfin = 'zz') then
                OK = 'S';
            else
                if ((CODZONA >= :GRPINI and CODZONA <= :GRPFIN)) then
                OK = 'S';
            END
        ELSE
            if (CODZONA >= :GRPINI AND CODZONA <= :GRPFIN) then
                OK = 'S';
        END
    if (AGRUPA = 'I') then
        BEGIN
        if (GRPINI = '') then
            BEGIN
            if ((CODCIUD IS NULL) or (CODCIUD >= :GRPINI AND CODCIUD <= :GRPFIN)) then
                OK = 'S';
            END
        ELSE
            if (CODCIUD >= :GRPINI AND CODCIUD <= :GRPFIN) then
                OK = 'S';
        END

    if (OK = 'S') then
        BEGIN
        if (CODCOBR IS NOT NULL) then
            SELECT COBR_NOM FROM COBRADORES  WHERE COBR_COD = :CODCOBR INTO :NOMCOBR;
        NOMZONA = '';
        NOMSUBZ = '';
        if (CODZONA is not null) then
            begin
            select ZONA_NOM from ZONAS where ZONA_ID = :CODZONA into :NOMZONA;
            if (codsubz is not null) then
                select SUBZ_NOM from SUBZONA where ZONA_ID = :CODZONA and SUBZ_COD = :codsubz into :nomsubz;
            end
        if (CODCIUD IS NOT NULL) then
            SELECT CIUD_NOM FROM CIUDADES  WHERE CIUD_COD = :CODCIUD INTO :NOMCIUD;
        nomcana = '';
        nomsubc = '';
        if (CODCIUD IS NOT NULL) then
            BEGIN
            SELECT CANA_NOM FROM CANAL WHERE CANA_COD = :codcana INTO :nomcana;
            if (codsubc IS NOT NULL) then
                SELECT SUBC_NOM FROM SUBCANAL WHERE CANA_COD = :codcana AND SUBC_COD = :codsubc INTO :nomsubc;
            END
        SALDO = 0;
        SALDOME = 0;
        difcmb = 0;
        RTFTE = 0;
        RTIVA = 0;
        RTICA = 0;
        DTOF = 0;
        DIAS = 0;
        /* BUSQUE EN SALDOS_DOC_CARTERA LOS QUE TENGAN SALDO > 0 */
        FOR SELECT MVCL_TIPOREF, MVCL_IDREF, MVCL_FECHA, cobr_cod, MVCL_VENCE
          FROM MOVIMIENTO_CLIENTES WHERE TERC_NIT = :NIT AND MVCL_SUCURSAL = :SUCURSAL AND MVCL_FECHA <= :FECHA AND
          MVCL_ABONO = 'N' AND ((SUCU_ID = :SUBEMPRESA) or (:SUBEMPRESA = 0)) AND ((:MONEDA = 0) or (MVCL_TRM <> 1))
          INTO :TIPO, :ID, :FECDOC, :codcobr, :VENCE
          DO
            BEGIN
            OK = 'S';
            if ((COBINI <> 0) or (COBFIN <> 999999999)) then
                IF ((codcobr < :COBINI) OR (codcobr > :COBFIN)) THEN
                    OK = 'N';
            if (OK = 'S') then
                begin
                if (FOV = 'FECHA') then
                   DIASDOC = FECHA - FECDOC;
                else
                    BEGIN
                    DIASDOC = FECHA - VENCE;
                    if ((TIPO = 31) AND (FOV = 'ENTREGA')) THEN
                        BEGIN
                        SELECT FACT_ENTREGA FROM FACTURAS WHERE FACT_ID = :ID INTO :VENCE;
                        DIASDOC = FECHA - VENCE;
                        END
                    END
                if (DIASDOC > DIAS) then
                    DIAS = DIASDOC;
                if ((inclanti = 'SI') or (TIPO <> 45)) then
                    BEGIN
                    EXECUTE PROCEDURE saldo_doc_cartera(TIPO, ID, FECHA, MONEDA) returning_values (PSALDO);
                    if (PSALDO <> 0) then
                        BEGIN
                        if (TIPO = 41) then
                            SELECT NDCL_DTOFMONTO, NDCL_FECHADTO, NDCL_TRM, NDCL_MONEDA FROM NOTAS_DEBITO_CLIENTES
                                WHERE NDCL_ID = :ID INTO :PDTOF, :FECDTO, :TRM, :tipomon;
                        if (TIPO = 42) then
                            SELECT 0, NCCL_FECHA, 1, NCCL_MONEDA FROM NOTAS_CREDITO_CLIENTES
                                WHERE NCCL_ID = :ID INTO :PDTOF, :FECDTO, :TRM, :tipomon;
                        if (TIPO = 45) then
                            SELECT ANCL_DTOFMONTO, ANCL_DTOFECHA, ANCL_TRM, 0 FROM ANTICIPOS_CLIENTE
                                WHERE ANCL_ID = :ID INTO :PDTOF, :FECDTO, :TRM, :tipomon;
                        if (TIPO = 31) then
                            SELECT FACT_DTOFMONTO, FACT_DTOFFECHA, FACT_TRM, FACT_MONEDA FROM FACTURAS
                                WHERE FACT_ID = :ID INTO :PDTOF, :FECDTO, :TRM, :tipomon;
                        if (TIPO = 33) then
                            SELECT 0, DEVT_FECHA, DEVT_TRM, DEVT_MONEDA FROM devoluciones_ventas
                                WHERE DEVT_ID = :ID INTO :PDTOF, :FECDTO, :TRM, :tipomon;
                        if (PDTOF IS NULL) then
                            PDTOF = 0;
                        if ((MONEDA <> 0) AND (TRM <> 0)) then
                            PDTOF = PDTOF / TRM;
                        if (PDTOF <> 0) then
                            BEGIN
                            SELECT SUM(RCDE_DTOF), MAX(RECA_TRM) FROM RECIBOS_CAJA_DETALLE D, recibos_caja R
                                WHERE R.reca_id = D.reca_id AND RCDE_IDDOC = :ID AND RCDE_TIPODOC = :TIPO INTO :DTOAPL, :TRM;
                            if (DTOAPL IS NULL) then
                                DTOAPL = 0;
                            if ((MONEDA <> 0) AND (TRM <> 0)) then
                               DTOAPL = DTOAPL / TRM;
                            PDTOF = PDTOF - DTOAPL;
                            /* SI YA SE VENCIO DEJELO EN CERO */
                            if (FECDTO < FECHA) then
                                PDTOF = 0;
                            END
                        if ((TIPOMON <> 0) AND (TIPOMON IS NOT NULL)) then
                            BEGIN
                            SELECT TM.taca_valor FROM tasa_cambio_moneda TM WHERE TM.timo_cod = :tipomon AND TM.taca_fecha = :fecha INTO :TRMHOY;
                            if (TRMHOY IS null) then
                                exception tasa_cambio_no_existe 'No existe la TRM para la fecha ' || :fecha || ' moneda:' || :tipomon;
                            END
                        ELSE
                            TRMHOY = 1;
                        if (MONEDA = 0) then
                            begin
                            SELECT SUM(SDCA_RTFTE - SDCA_ABRTFTE), SUM(SDCA_RTIVA - SDCA_ABRTIVA), SUM(SDCA_RTICA - SDCA_ABRTICA), SUM(SDCA_RCREE - SDCA_ABRCREE)
                                FROM SALDOS_DOC_CARTERA WHERE SDCA_TIPOREF = :TIPO AND SDCA_IDREF = :ID and sdca_fecha <= :fecha
                                INTO :PRTFTE, :PRTIVA, :PRTICA, :prcree;
                            if (DIFCAMBIO = 'S') then
                                IF (TRM <> 1) then
                                    BEGIN
                                    PSALDOME = 0;
                                    SELECT SUM((SDCA_RTFTE - SDCA_ABRTFTE)/SDCA_TRM), SUM((SDCA_RTIVA - SDCA_ABRTIVA)/SDCA_TRM), SUM((SDCA_RTICA - SDCA_ABRTICA)/SDCA_TRM), SUM((SDCA_RCREE - SDCA_ABRCREE)/SDCA_TRM)
                                        FROM SALDOS_DOC_CARTERA WHERE SDCA_TIPOREF = :TIPO AND SDCA_IDREF = :ID and sdca_fecha <= :fecha
                                        INTO :PRTFTE, :PRTIVA, :PRTICA, :PRCREE;
                                    PRTFTE = PRTFTE * TRMHOY;
                                    PRTIVA = PRTIVA * TRMHOY;
                                    PRTICA = PRTICA * TRMHOY;
                                    PRCREE = PRCREE * TRMHOY;
                                    PDIFCMB = PSALDO;
                                    PSALDOME = PSALDO / TRM;
                                    PSALDO = PSALDOME * TRMHOY;
                                    PDIFCMB = PSALDO - PDIFCMB;
                                    END
                                ELSE
                                    PDIFCMB = 0;
                            ELSE
                                PDIFCMB = 0;
                            end
                        ELSE
                            begin
                            SELECT SUM((SDCA_RTFTE - SDCA_ABRTFTE)/SDCA_TRM), SUM((SDCA_RTIVA - SDCA_ABRTIVA)/SDCA_TRM), SUM((SDCA_RTICA - SDCA_ABRTICA)/SDCA_TRM), SUM((SDCA_RCREE - SDCA_ABRCREE)/SDCA_TRM)
                                FROM SALDOS_DOC_CARTERA WHERE SDCA_TIPOREF = :TIPO AND SDCA_IDREF = :ID and sdca_fecha <= :fecha
                                INTO :PRTFTE, :PRTIVA, :PRTICA, :prcree;
                            difcmb = 0;
                            end
                        if (PRTFTE IS NULL) then
                            PRTFTE = 0;
                        if ((TIPO = 42) or (TIPO = 45) or (TIPO = 33)) THEN
                            BEGIN
                            if (PRTFTE > 0) then
                                PRTFTE = 0;
                            END
                        ELSE    
                            BEGIN
                            if (PRTFTE < 0) then
                                PRTFTE = 0;
                            END
                        if (PRTIVA IS NULL) then
                            PRTIVA = 0;
                        if ((TIPO = 42) or (TIPO = 45) or (TIPO = 33)) THEN
                            BEGIN
                            if (PRTIVA > 0) then
                                PRTIVA = 0;
                            END
                        ELSE
                            BEGIN
                            if (PRTIVA < 0) then
                                PRTIVA = 0;
                            END
                        if (PRTICA IS NULL) then
                            PRTICA = 0;
                        if ((TIPO = 42) or (TIPO = 45) or (TIPO = 33)) THEN
                            BEGIN
                            if (PRTICA > 0) then
                                PRTICA = 0;
                            END
                        ELSE
                            BEGIN
                            if (PRTICA < 0) then
                                PRTICA = 0;
                            END
    
                        if (FAUTORET <= FECDOC) then
                            PRTFTE = 0;
    
                        if (prcree IS NULL) then
                            prcree = 0;
                        if ((TIPO = 42) or (TIPO = 45) or (TIPO = 33)) THEN
                            BEGIN
                            if (prcree > 0) then
                                prcree = 0;
                            END
                        ELSE    
                            BEGIN
                            if (prcree < 0) then
                                prcree = 0;
                            END
                        if (fautorcree <= FECDOC) then
                            prcree = 0;
    
                        SALDO = SALDO + PSALDO;
                        SALDOME = SALDOME + PSALDOME;
                        difcmb = DIFCMB + pdifcmb;
                        RTFTE = RTFTE + PRTFTE;
                        RTIVA = RTIVA + PRTIVA;
                        RTICA = RTICA + PRTICA;
                        RCREE = RCREE + prcree;
                        DTOF = DTOF + PDTOF;
                        END /* SALDO <> 0 */
                    END  /* NO ANTICIPO */
                END
            END
        DISPONIBLE = CUPO - SALDO;
        /* LOS RECIBOS PROVISIONALES */
        SELECT SUM(RPDE_ABONO), MAX(RCPR_TRM) FROM recibo_provisional P, recibo_provisional_detalle D
            WHERE P.rcpr_id = D.rcpr_id AND TERC_NIT = :NIT AND RPDE_SUCURSAL = :SUCURSAL AND ((:MONEDA = 0) or (RCPR_TRM <> 1)) AND
            RCPR_FECHA <= :FECHA AND RCPR_ANULADO = 'N' AND ((RCPR_FECCRUCE IS NULL) or (RCPR_FECCRUCE > :FECHA)) AND
            ((SUCU_ID = :SUBEMPRESA) or (:SUBEMPRESA = 0))
            INTO :provisional, :TRM;
        if ((MONEDA <> 0) AND (TRM <> 0)) then
            PROVISIONAL = PROVISIONAL / TRM;
           if (:descnt_prov = 'SI') then
             if (NOT :provisional is NULL) then
              SALDO = :saldo - :PROVISIONAL;
        SUSPEND;
        END
    if (AGRUPA = 'C') then
        BEGIN
        NOMZONA = '';
        NOMSUBZ = '';
        if (CODZONA is not null) then
            begin
            select ZONA_NOM from ZONAS where ZONA_ID = :CODZONA into :NOMZONA;
            if (codsubz is not null) then
                select SUBZ_NOM from SUBZONA where ZONA_ID = :CODZONA and SUBZ_COD = :codsubz into :nomsubz;
            end
        if (CODCIUD IS NOT NULL) then
            SELECT CIUD_NOM FROM CIUDADES  WHERE CIUD_COD = :CODCIUD INTO :NOMCIUD;
        if (CODCIUD IS NOT NULL) then
            BEGIN
            SELECT CANA_NOM FROM CANAL WHERE CANA_COD = :codcana INTO :nomcana;
            if (codsubc IS NOT NULL) then
                SELECT SUBC_NOM FROM SUBCANAL WHERE CANA_COD = :codcana AND SUBC_COD = :codsubc INTO :nomsubc;
            END
        FOR SELECT DISTINCT COBR_COD FROM MOVIMIENTO_CLIENTES WHERE TERC_NIT = :NIT AND
            MVCL_SUCURSAL = :SUCURSAL AND MVCL_FECHA <= :FECHA AND
            MVCL_ABONO = 'N' AND ((SUCU_ID = :SUBEMPRESA) or (:SUBEMPRESA = 0))
            INTO :codcobr
            DO
            begin
            OK = 'N';
            if (COBINI = 0) then
                BEGIN
                if ((CODCOBR IS NULL) or (CODCOBR >= :COBINI AND CODCOBR <= :COBFIN)) then
                    OK = 'S';
                END
            ELSE
                if (CODCOBR >= :COBINI AND CODCOBR <= :COBFIN) then
                    OK = 'S';
            if (OK = 'S') then
                BEGIN
                OK = 'N';
                if (GRPINI = '') then
                    BEGIN
                    if ((CODZONA IS NULL) or (CODZONA >= :GRPINI AND CODZONA <= :GRPFIN)) then
                        OK = 'S';
                    END
                ELSE
                    if (CODZONA >= :GRPINI AND CODZONA <= :GRPFIN) then
                        OK = 'S';
                if (OK = 'S') then
                    BEGIN
                    SELECT COBR_NOM FROM COBRADORES  WHERE COBR_COD = :CODCOBR INTO :NOMCOBR;
    
                    SALDO = 0;
                    SALDOME = 0;
                    difcmb = 0;
                    RTFTE = 0;
                    RTIVA = 0;
                    RTICA = 0;
                    DTOF = 0;
                    DIAS = 0;
                    /* BUSQUE EN SALDOS_DOC_CARTERA LOS QUE TENGAN SALDO > 0 */
                    FOR SELECT MVCL_TIPOREF, MVCL_IDREF, MVCL_FECHA
                      FROM MOVIMIENTO_CLIENTES WHERE TERC_NIT = :NIT AND MVCL_SUCURSAL = :SUCURSAL AND ((:moneda = 0) or (mvcl_trm <> 1)) AND
                      MVCL_FECHA <= :FECHA AND COBR_COD = :codcobr AND MVCL_ABONO = 'N' AND ((SUCU_ID = :SUBEMPRESA) or (:SUBEMPRESA = 0))
                      INTO :TIPO, :ID, :FECDOC
                      DO
                        BEGIN
                        if ((inclanti = 'SI') or (TIPO <> 45)) then
                            BEGIN
                            if (FOV = 'FECHA') then
                               DIASDOC = FECHA - FECDOC;
                            else
                                BEGIN
                                DIASDOC = FECHA - VENCE;
                                if ((TIPO = 31) AND (FOV = 'ENTREGA')) THEN
                                    BEGIN
                                    SELECT FACT_ENTREGA FROM FACTURAS WHERE FACT_ID = :ID INTO :VENCE;
                                    DIASDOC = FECHA - VENCE;
                                    END
                                END
                            if (DIASDOC > DIAS) then
                                DIAS = DIASDOC;
                            EXECUTE PROCEDURE saldo_doc_cartera(TIPO, ID, FECHA, MONEDA) returning_values (PSALDO);
                            if (PSALDO <> 0) then
                                BEGIN
                                if (TIPO = 41) then
                                    SELECT NDCL_DTOFMONTO, NDCL_FECHADTO, NDCL_TRM, NDCL_MONEDA FROM NOTAS_DEBITO_CLIENTES
                                        WHERE NDCL_ID = :ID INTO :PDTOF, :FECDTO, :TRM, :tipomon;
                                if (TIPO = 42) then
                                    SELECT 0, NCCL_FECHA, 1, NCCL_MONEDA FROM NOTAS_CREDITO_CLIENTES
                                        WHERE NCCL_ID = :ID INTO :PDTOF, :FECDTO, :TRM, :tipomon;
                                if (TIPO = 45) then
                                    SELECT ANCL_DTOFMONTO, ANCL_DTOFECHA, ANCL_TRM, 0 FROM ANTICIPOS_CLIENTE
                                        WHERE ANCL_ID = :ID INTO :PDTOF, :FECDTO, :TRM, :tipomon;
                                if (TIPO = 31) then
                                    SELECT FACT_DTOFMONTO, FACT_DTOFFECHA, FACT_TRM, FACT_MONEDA FROM FACTURAS
                                        WHERE FACT_ID = :ID INTO :PDTOF, :FECDTO, :TRM, :tipomon;
                                if (TIPO = 33) then
                                    SELECT 0, DEVT_FECHA, DEVT_TRM, DEVT_MONEDA FROM devoluciones_ventas
                                        WHERE DEVT_ID = :ID INTO :PDTOF, :FECDTO, :TRM, :tipomon;
                                if (PDTOF IS NULL) then
                                    PDTOF = 0;
                                if ((MONEDA <> 0) AND (TRM <> 0)) then
                                    PDTOF = PDTOF / TRM;
                                if (PDTOF <> 0) then
                                    BEGIN
                                    SELECT SUM(RCDE_DTOF), MAX(RECA_TRM) FROM RECIBOS_CAJA_DETALLE D, RECIBOS_CAJA R
                                        WHERE R.reca_id = D.reca_id AND RCDE_IDDOC = :ID AND RCDE_TIPODOC = :TIPO INTO :DTOAPL, :TRM;
                                    if (DTOAPL IS NULL) then
                                        DTOAPL = 0;
                                    if ((MONEDA <> 0) AND (TRM <> 0)) then
                                       DTOAPL = DTOAPL / TRM;
                                    PDTOF = PDTOF - DTOAPL;
                                    /* SI YA SE VENCIO DEJELO EN CERO */
                                    if (FECDTO < FECHA) then
                                        PDTOF = 0;
                                    END
                                if ((TIPOMON <> 0) AND (TIPOMON IS NOT NULL)) then
                                    BEGIN
                                    SELECT TM.taca_valor FROM tasa_cambio_moneda TM WHERE TM.timo_cod = :tipomon AND TM.taca_fecha = :fecha INTO :TRMHOY;
                                    if (TRMHOY IS null) then
                                        exception tasa_cambio_no_existe 'No existe la TRM para la fecha ' || :fecha || ' moneda:' || :tipomon;
                                    END
                                ELSE
                                    TRMHOY = 1;
                                if (MONEDA = 0) then
                                    begin
                                    SELECT SUM(SDCA_RTFTE - SDCA_ABRTFTE), SUM(SDCA_RTIVA - SDCA_ABRTIVA), SUM(SDCA_RTICA - SDCA_ABRTICA), SUM(SDCA_RCREE - SDCA_ABRCREE)
                                        FROM SALDOS_DOC_CARTERA WHERE SDCA_TIPOREF = :TIPO AND SDCA_IDREF = :ID and sdca_fecha <= :fecha
                                        INTO :PRTFTE, :PRTIVA, :PRTICA, :prcree;
                                    if (DIFCAMBIO = 'S') then
                                        IF (TRM <> 1) then
                                            BEGIN
                                            PSALDOME = 0;
                                            SELECT SUM((SDCA_RTFTE - SDCA_ABRTFTE)/SDCA_TRM), SUM((SDCA_RTIVA - SDCA_ABRTIVA)/SDCA_TRM), SUM((SDCA_RTICA - SDCA_ABRTICA)/SDCA_TRM), SUM((SDCA_RCREE - SDCA_ABRCREE)/SDCA_TRM)
                                                FROM SALDOS_DOC_CARTERA WHERE SDCA_TIPOREF = :TIPO AND SDCA_IDREF = :ID and sdca_fecha <= :fecha
                                                INTO :PRTFTE, :PRTIVA, :PRTICA, :prcree;
                                            PRTFTE = PRTFTE * TRMHOY;
                                            PRTIVA = PRTIVA * TRMHOY;
                                            PRTICA = PRTICA * TRMHOY;
                                            PRCREE = PRCREE * TRMHOY;
                                            PDIFCMB = PSALDO;
                                            PSALDOME = PSALDO / TRM;
                                            PSALDO = PSALDOME * TRMHOY;
                                            PDIFCMB = PSALDO - PDIFCMB;
                                            END
                                        ELSE
                                            PDIFCMB = 0;
                                    ELSE
                                        PDIFCMB = 0;
                                    end
                                ELSE
                                    SELECT SUM((SDCA_RTFTE - SDCA_ABRTFTE)/SDCA_TRM), SUM((SDCA_RTIVA - SDCA_ABRTIVA)/SDCA_TRM), SUM((SDCA_RTICA - SDCA_ABRTICA)/SDCA_TRM), SUM((SDCA_RCREE - SDCA_ABRCREE)/SDCA_TRM)
                                        FROM SALDOS_DOC_CARTERA WHERE SDCA_TIPOREF = :TIPO AND SDCA_IDREF = :ID and sdca_fecha <= :fecha
                                        INTO :PRTFTE, :PRTIVA, :PRTICA, :prcree;
                                if (PRTFTE IS NULL) then
                                    PRTFTE = 0;
                                if ((TIPO = 42) or (TIPO = 45) or (TIPO = 33)) THEN
                                    BEGIN
                                    if (PRTFTE > 0) then
                                        PRTFTE = 0;
                                    END
                                ELSE
                                    BEGIN
                                    if (PRTFTE < 0) then
                                        PRTFTE = 0;
                                    END
                                if (PRTIVA IS NULL) then
                                    PRTIVA = 0;
                                if ((TIPO = 42) or (TIPO = 45) or (TIPO = 33)) THEN
                                    BEGIN
                                    if (PRTIVA > 0) then
                                        PRTIVA = 0;
                                    END
                                ELSE
                                    BEGIN
                                    if (PRTIVA < 0) then
                                        PRTIVA = 0;
                                    END
                                if (PRTICA IS NULL) then
                                    PRTICA = 0;
                                if ((TIPO = 42) or (TIPO = 45) or (TIPO = 33)) THEN
                                    BEGIN
                                    if (PRTICA > 0) then
                                        PRTICA = 0;
                                    END
                                ELSE
                                    BEGIN
                                    if (PRTICA < 0) then
                                        PRTICA = 0;
                                    END
                                if (FAUTORET <= FECDOC) then
                                    PRTFTE = 0;
                                if (prcree IS NULL) then
                                    prcree = 0;
                                if ((TIPO = 42) or (TIPO = 45) or (TIPO = 33)) THEN
                                    BEGIN
                                    if (prcree > 0) then
                                        prcree = 0;
                                    END
                                ELSE
                                    BEGIN
                                    if (prcree < 0) then
                                        prcree = 0;
                                    END
                                if (fautorcree <= FECDOC) then
                                    prcree = 0;
                                SALDO = SALDO + PSALDO;
                                SALDOME = SALDOME + PSALDOME;
                                difcmb = DIFCMB + pdifcmb;
                                RTFTE = RTFTE + PRTFTE;
                                RTIVA = RTIVA + PRTIVA;
                                RTICA = RTICA + PRTICA;
                                RCREE = RCREE + prcree;
                                DTOF = DTOF + PDTOF;
                                END /* SALDO <> 0 */
                            END  /* NO ANTICIPO */
                        END
                    DISPONIBLE = CUPO - SALDO;
                    /* LOS RECIBOS PROVISIONALES */
                    SELECT SUM(RPDE_ABONO), MAX(RCPR_TRM) FROM RECIBO_PROVISIONAL P, recibo_provisional_detalle D
                        WHERE P.rcpr_id = D.rcpr_id AND TERC_NIT = :NIT AND RPDE_SUCURSAL = :SUCURSAL AND ((:MONEDA = 0) or (RCPR_TRM <> 1)) AND
                        VEND_COD = :CODCOBR AND RCPR_FECHA <= :FECHA AND RCPR_ANULADO = 'N' AND ((RCPR_FECCRUCE IS NULL) or (RCPR_FECCRUCE > :FECHA)) AND 
                        ((SUCU_ID = :SUBEMPRESA) or (:SUBEMPRESA = 0))
                        INTO :provisional, :TRM;
                    if ((MONEDA <> 0) AND (TRM <> 0)) then
                        PROVISIONAL = PROVISIONAL / TRM;
                    if (:descnt_prov = 'SI') then
                       if (NOT :provisional IS NULL) then
                        SALDO = :saldo - :PROVISIONAL;
                    if (AUTORET = 'SI') then
                        BEGIN
                        RTFTE = 0;
                        RTIVA = 0;
                        RTICA = 0;
                        END
                    SUSPEND;
                    END  /* OK = S */
                END
            END  /* FOR COBRADOR */
        END  /* AGRUPA = C */
    END  /* FOR NIT */
END