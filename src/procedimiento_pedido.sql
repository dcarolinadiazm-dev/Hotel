create or alter procedure GRABE_PEDIDO_APP (
    ID integer)
returns (
    IDPED integer,
    NUMPED varchar(12),
    PEWD_TOTAL numeric(18,2))
as
declare variable PREF varchar(4);
declare variable IVAINC char(1);
declare variable FECHA date;
declare variable PEWD_ITEM integer;
declare variable ARTI_COD varchar(20);
declare variable PEWD_CODBAR varchar(60);
declare variable BODE_COD varchar(2);
declare variable PEWD_CANT numeric(18,4);
declare variable PEWD_UNIDAD varchar(8);
declare variable PEWD_FACTOR numeric(18,4);
declare variable LIPR_COD integer;
declare variable PEWD_PRUNIT numeric(18,2);
declare variable PEWD_DTOP numeric(18,2);
declare variable PEWD_DTOM numeric(18,2);
declare variable PEWD_DTO1 numeric(18,2);
declare variable PEWD_DTO2 numeric(18,2);
declare variable PEWD_DTO3 numeric(18,2);
declare variable PEWD_DTO1M numeric(18,2);
declare variable PEWD_DTO2M numeric(18,2);
declare variable PEWD_DTO3M numeric(18,2);
declare variable PEWD_IVAP numeric(18,2);
declare variable PEWD_IVAMONTO numeric(18,2);
declare variable PEWD_CONSUMO numeric(18,2);
declare variable PEWD_REFERENCIA varchar(60);
declare variable PEWD_DESC varchar(300);
declare variable EXRES varchar(10);
declare variable EXIS char(1);
declare variable ENSAMBLE char(1);
declare variable EXISTEN numeric(18,4);
declare variable RESERVA numeric(18,4);
begin
IDPED = gen_id(id_pedido, 1);
select PEWE_PREF, pewe_fecha from PEDIDO_WEB where PEWE_ID = :ID into :PREF, :fecha;
select PREF_IVAINC from PREFIJOS where TIDO_COD = 34 and PREF_PRE = :PREF into :IVAINC;
execute procedure LEE_CONFIGURACION ('INVENTARIO','EXISTENCIAS','ACCION A TOMAR SI LA EXISTENCIA ESTA RESERVADA') returning_values (EXRES);

/* EL ENCABEZADO: Se asigna PEDI_IDTIENDA con el ID de la habitación (PEWE_EVENTO) */
insert into PEDIDOS (PEDI_ID, TERC_NIT, VEND_COD, TIDO_COD, PREF_PRE, PEDI_NUMERO, PEDI_FECHA, PEDI_VALIDEZ,
    PEDI_DESPACHO, PEDI_OBS, PEDI_IVAINC, PEDI_NOMTERC, PEDI_DTOPOR, PEDI_DTOMONTO, PEDI_ADICIONAL, PEDI_IVAMONTO,
    PEDI_EXTRA, PEDI_TOTAL, PEDI_ANULADO, PEDI_TRANSMIT, PTVT_ID, PEDI_COTIZACI, PEDI_RTFTEPORC, PEDI_RTFTEMONTO,
    PEDI_RTIVAPORC, PEDI_RTIVAMONTO, PEDI_RTICAPORC, PEDI_RTICAMONTO, PEDI_NROCOPIA, PEDI_CONSOLIDA, PEDI_USUARIO,
    PEDI_SUCURSAL, NUMOK, PEDI_FACTOR, PEDI_TRM, PEDI_DTOIT1, PEDI_DTOIT2, PEDI_DTOIT3, PEDI_VENCE, PEDI_ENTREGA, PEDI_DIASCR,
    PEDI_IDENTR, PEDI_PENDIENTE, PEDI_CANAL, PEDI_PEDWEB, PEDI_TIPOENTREGA, PEDI_HORAENTREGA, PEDI_EVENTO, PEDI_IDTIENDA)
    select :IDPED, TERC_NIT, VEND_COD, 34, PEWE_PREF, '000001', PEWE_FECHA, 0,
    '', PEWE_OBS, :IVAINC, PEWE_NOMCLI, PEWE_DTOPORC, PEWE_DTOMONTO, PEWE_ADICIONAL, PEWE_IVAMONTO,
    PEWE_EXTRA, PEWE_TOTAL, 'N', 'N', PTVT_ID, '', PEWE_RTFTEPORC, 0, PEWE_RTIVAPORC, 0, PEWE_RTICAPORC, 0, 0, 0, user,
    PEWE_SUCURSAL, 'N', 1, 1, 0, 0, 0, PEWE_ENTREGA, PEWE_ENTREGA, PEWE_DIASCR, 0, 'N', 0, PEWE_ID, PEWE_TIPOENTREGA,
    PEWE_HORAENTREGA, PEWE_EVENTO, PEWE_EVENTO
    from PEDIDO_WEB where PEWE_ID = :ID;

/* LOS ITEMS */
for select PEWD_ITEM, ARTI_COD, PEWD_CODBAR, BODE_COD, PEWD_CANT, PEWD_UNIDAD, PEWD_FACTOR, LIPR_COD,
           PEWD_PRUNIT, PEWD_DTOP, PEWD_DTO1, PEWD_DTO2, PEWD_DTO3, PEWD_IVAP, PEWD_IVAMONTO, PEWD_CONSUMO, PEWD_TOTAL,
           PEWD_REFERENCIA, PEWD_DTOM, PEWD_DTO1M, PEWD_DTO2M, PEWD_DTO3M, PEWD_DESC
    from PEDIDO_WEB_DETALLE where PEWE_ID = :id order by pewd_item
    into :PEWD_ITEM, :ARTI_COD, :PEWD_CODBAR, :BODE_COD, :PEWD_CANT, :PEWD_UNIDAD, :PEWD_FACTOR, :LIPR_COD,
         :PEWD_PRUNIT, :PEWD_DTOP, :PEWD_DTO1, :PEWD_DTO2, :PEWD_DTO3, :PEWD_IVAP, :PEWD_IVAMONTO, :PEWD_CONSUMO,
         :PEWD_TOTAL, :PEWD_REFERENCIA, :PEWD_DTOM, :PEWD_DTO1M, :PEWD_DTO2M, :PEWD_DTO3M, :PEWD_DESC
    do
    begin
    /* valide existencias */
    if (EXRES = 'PROHIBIR') then
        begin
        select ARTI_EXIST, ARTI_ENSAMBLE from ARTICULO where ARTI_COD = :ARTI_COD into :EXIS, :ENSAMBLE;
        if (ENSAMBLE = 'N') then
            begin
            if (EXIS <> 'N') then
                begin
                execute procedure existencia_bodega(:arti_cod, :fecha, :bode_cod) returning_values (:existen, :reserva);
                if ((:pewd_cant * :pewd_factor) > (:existen - :reserva)) then
                    pewd_cant = (:existen - :reserva) / :pewd_factor;
                if (PEWD_CANT > 0) then
                    begin
                    insert into PEDIDOS_DETALLE (PEDI_ID, PEDE_ITEM, ARTI_COD, PEDE_CANT, PEDE_UNIDAD, PEDE_DTOPORC, PEDE_DTOMONTO,
                        PEDE_IVAPORC, PEDE_IVAMONTO, PEDE_CONSUMO, PEDE_FACTOR, PEDE_DESC, PEDE_OBS, PEDE_CODBAR, PEDE_TOTAL,
                        PEDE_ANULADO, PEDE_TRANSMIT, LIPR_COD, PEDE_REFERENCIA, PEDE_PRUNIT, PEDE_FACTURAD, PEDE_REMISIONAD,
                        PEDE_RESERVA, BODE_COD, PEDE_DTO1, PEDE_DTO2, PEDE_DTO3, PEDE_DTOM1, PEDE_DTOM2, PEDE_DTOM3, PEDE_DEVUELTO)
                    values (:idped, :PEWD_ITEM, :ARTI_COD, :PEWD_CANT, :PEWD_UNIDAD, :PEWD_DTOP, :PEWD_DTOM,
                        :PEWD_IVAP, :PEWD_IVAMONTO, :PEWD_CONSUMO, :PEWD_FACTOR, :PEWD_DESC, null, :PEWD_CODBAR, :PEWD_TOTAL,
                        'N', 'N', :LIPR_COD, :PEWD_REFERENCIA, :PEWD_PRUNIT, 0, 0,
                        0, :BODE_COD, :PEWD_DTO1, :PEWD_DTO2, :PEWD_DTO3, :PEWD_DTO1M, :PEWD_DTO2M, :PEWD_DTO3M, 0);
                    end
                end
            else
                begin
                insert into PEDIDOS_DETALLE (PEDI_ID, PEDE_ITEM, ARTI_COD, PEDE_CANT, PEDE_UNIDAD, PEDE_DTOPORC, PEDE_DTOMONTO,
                    PEDE_IVAPORC, PEDE_IVAMONTO, PEDE_CONSUMO, PEDE_FACTOR, PEDE_DESC, PEDE_OBS, PEDE_CODBAR, PEDE_TOTAL,
                    PEDE_ANULADO, PEDE_TRANSMIT, LIPR_COD, PEDE_REFERENCIA, PEDE_PRUNIT, PEDE_FACTURAD, PEDE_REMISIONAD,
                    PEDE_RESERVA, BODE_COD, PEDE_DTO1, PEDE_DTO2, PEDE_DTO3, PEDE_DTOM1, PEDE_DTOM2, PEDE_DTOM3, PEDE_DEVUELTO)
                values (:IDPED, :PEWD_ITEM, :ARTI_COD, :PEWD_CANT, :PEWD_UNIDAD, :PEWD_DTOP, :PEWD_DTOM,
                    :PEWD_IVAP, :PEWD_IVAMONTO, :PEWD_CONSUMO, :PEWD_FACTOR, :PEWD_DESC, null, :PEWD_CODBAR, :PEWD_TOTAL,
                    'N', 'N', :LIPR_COD, :PEWD_REFERENCIA, :PEWD_PRUNIT, 0, 0,
                    0, :BODE_COD, :PEWD_DTO1, :PEWD_DTO2, :PEWD_DTO3, :PEWD_DTO1M, :PEWD_DTO2M, :PEWD_DTO3M, 0);
                end
            end
        end
    else
        begin
        insert into PEDIDOS_DETALLE (PEDI_ID, PEDE_ITEM, ARTI_COD, PEDE_CANT, PEDE_UNIDAD, PEDE_DTOPORC, PEDE_DTOMONTO,
            PEDE_IVAPORC, PEDE_IVAMONTO, PEDE_CONSUMO, PEDE_FACTOR, PEDE_DESC, PEDE_OBS, PEDE_CODBAR, PEDE_TOTAL,
            PEDE_ANULADO, PEDE_TRANSMIT, LIPR_COD, PEDE_REFERENCIA, PEDE_PRUNIT, PEDE_FACTURAD, PEDE_REMISIONAD,
            PEDE_RESERVA, BODE_COD, PEDE_DTO1, PEDE_DTO2, PEDE_DTO3, PEDE_DTOM1, PEDE_DTOM2, PEDE_DTOM3, PEDE_DEVUELTO)
        values (:IDPED, :PEWD_ITEM, :ARTI_COD, :PEWD_CANT, :PEWD_UNIDAD, :PEWD_DTOP, :PEWD_DTOM,
            :PEWD_IVAP, :PEWD_IVAMONTO, :PEWD_CONSUMO, :PEWD_FACTOR, :PEWD_DESC, null, :PEWD_CODBAR, :PEWD_TOTAL,
            'N', 'N', :LIPR_COD, :PEWD_REFERENCIA, :PEWD_PRUNIT, 0, 0,
            0, :BODE_COD, :PEWD_DTO1, :PEWD_DTO2, :PEWD_DTO3, :PEWD_DTO1M, :PEWD_DTO2M, :PEWD_DTO3M, 0);
        end
    end
update PEDIDO_WEB set PEWE_IDPED = :IDPED where PEWE_ID = :ID;
select PREF_PRE || PEDI_NUMERO from PEDIDOS where PEDI_ID = :IDPED into :NUMPED;
execute procedure actualice_total_docventa(34, :idped);
select pedi_total from pedidos where pedi_id = :idped into :pewd_total;
if (pewd_total = 0) then
    update PEDIDOS set PEDI_ANULADO = 'S' where PEDI_ID = :idped;

suspend;
end