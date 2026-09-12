create or alter procedure EXISTENCIAS_UNIDAD_BOD (
    ARTICULO varchar(15),
    FECHA date,
    UNIDAD varchar(8),
    BOD varchar(2))
returns (
    BODEGA varchar(2),
    EXISTENCIA numeric(18,2),
    RESERVADO numeric(18,2),
    ORDENADO numeric(18,2),
    STAND varchar(20))
as
declare variable FACTOR numeric(18,6);
declare variable ORDENC numeric(18,4);
declare variable PEDIDO numeric(18,4);
declare variable ITEM integer;
declare variable ID integer;
declare variable UND varchar(8);
declare variable CANT numeric(18,4);
declare variable FACTOR2 numeric(18,6);
declare variable PEDAUTO char(2);
declare variable VALIDEZ integer;
declare variable EXRES char(10);
begin
BODEGA = BOD;
execute procedure FACTOR_UNIDAD_CANT(:ARTICULO, :UNIDAD) returning_values (:FACTOR);
select STAND_COD from STANDS where ARTI_COD = :ARTICULO and STAND_BODEGA = :BODEGA into :stand;
execute procedure saldo_inventario (:articulo, :bodega, :fecha) returning_values (:Existencia);
if (FACTOR <> 0) then
    EXISTENCIA = EXISTENCIA / FACTOR;
else
    EXISTENCIA = 0;
/* LO ORDENADO */
select sum(ORID_ENTREGAR)
  from ORDENINVENTARIO_DETALLE OD, ordenes_inventario O
  where O.ORIN_ID = OD.ORIN_ID and ARTI_COD = :ARTICULO and ORIN_FECHA <= :FECHA and ORIN_FECLLEGA >= :FECHA and ORID_ANULADO = 'N' and OD.BODE_COD = :BODEGA
  into :ORDENADO;
if (ORDENADO is null) then
    ORDENADO = 0;
ORDENC = 0;
for select O.ORDC_ID, OCDE_ITEM, OCDE_CANT * OCDE_FACTOR
    from ORDENES_COMPRA O, ORDENES_COMPRA_DETALLE OD
    where O.ORDC_ID = OD.ORDC_ID and OD.ARTI_COD = :ARTICULO and (ORDC_FECHA+ORDC_VALIDEZ) >= :FECHA and ORDC_FECHA <= :FECHA
    and OCDE_ANULADO = 'N' and ORDC_APROBADO = 'S' and OD.BODE_COD = :BODEGA
    into :ID, :ITEM, :CANT
    do
    begin
    execute procedure FALTANTE(23, 21, ID, ITEM) returning_values (PEDIDO, UND, FACTOR2);
    if (PEDIDO * FACTOR2 = CANT) then /* SI NO SE HA FACTURADO MIRE A VER SI SE REMISIONO */
        execute procedure FALTANTE(23, 22, ID, ITEM) returning_values (PEDIDO, UND, FACTOR2);
    if (PEDIDO is null) then
        PEDIDO = 0;
    ORDENC = ORDENC + PEDIDO * FACTOR2;
    end
ORDENADO = ORDENADO + ORDENC;
if (FACTOR <> 0) then
    ORDENADO = ORDENADO / FACTOR;
execute procedure LEE_CONFIGURACION('INVENTARIO', 'EXISTENCIAS', 'ACCION A TOMAR SI LA EXISTENCIA ESTA RESERVADA') returning_values (EXRES);
if (EXRES <> 'IGNORAR') then
    BEGIN
    /* LO RESERVADO */
    select sum(RSDE_LIBERAR)
        from RESERVAS_DETALLE RD, RESERVAS R
        where R.RESE_ID = RD.RESE_ID and ARTI_COD = :ARTICULO and RESE_FECHA <= :FECHA and RESE_VENCE >= :FECHA and RD.BODE_COD = :BODEGA and RSDE_ANULADO = 'N'
        into :RESERVADO;
    if (RESERVADO is null) then
        RESERVADO = 0;
    execute procedure LEE_CONFIGURACION('FACTURACION', 'FACTURAS', 'GENERAR PEDIDO AUTOMATICAMENTE CON LA FACTURA') returning_values (pedauto);
    execute procedure LEE_CONFIGURACION('FACTURACION', 'PEDIDOS', 'DIAS DE VALIDEZ') returning_values (VALIDEZ);
    PEDIDO = 0;
    for select P.PEDI_ID, PEDE_ITEM, PEDE_CANT * PEDE_FACTOR
        from PEDIDOS P, PEDIDOS_DETALLE PD
        where P.PEDI_ID = PD.PEDI_ID and PD.ARTI_COD = :ARTICULO and PEDI_FECHA >= (:FECHA-:VALIDEZ) and PEDI_FECHA <= :FECHA and PEDE_ANULADO = 'N' and BODE_COD = :BODEGA and PEDI_VALIDEZ >= 0
        into :ID, :ITEM, :CANT
        do
        begin
        execute procedure FALTANTE(34, 31, ID, ITEM) returning_values (ORDENC, UND, FACTOR2);
        if ((ORDENC * FACTOR2 = CANT) or (PEDAUTO = 'SI')) then /* SI NO SE HA FACTURADO MIRE A VER SI SE REMISIONO */
            execute procedure FALTANTE(34, 32, ID, ITEM) returning_values (ORDENC, UND, FACTOR2);
        if (ORDENC is null) then
            ORDENC = 0;
        PEDIDO = PEDIDO + ORDENC * FACTOR2;
        end
    RESERVADO = RESERVADO + PEDIDO;
    if (FACTOR <> 0) then
        RESERVADO = RESERVADO / FACTOR;
    END
ELSE
    RESERVADO = 0;
suspend;
end