import { db } from '../src/config/knex.config';

const TRIGGER_SQL = `
CREATE OR ALTER TRIGGER FACTURAS_CONTADO_PAGO_AI FOR FACTURAS_CONTADO_PAGO
ACTIVE AFTER INSERT POSITION 0
AS
declare variable CARTERA CHAR(1);
declare variable CAJA INTEGER;
declare variable PUNTO INTEGER;
declare variable CONTADO CHAR(1);
declare variable PREFR VARCHAR(4);
declare variable NUMR VARCHAR(8);
declare variable IDR INTEGER;
declare variable FECHA DATE;
declare variable PREFF VARCHAR(4);
declare variable NUMF VARCHAR(8);
declare variable NIT VARCHAR(20);
declare variable NOMCLI VARCHAR(60);
declare variable VEND INTEGER;
declare variable MONTO NUMERIC(18,2);
declare variable SUCURSAL VARCHAR(20);
declare variable PEDIDO VARCHAR(20);
declare variable IDPED INTEGER;
declare variable PREFA VARCHAR(4);
declare variable NUMA VARCHAR(8);
declare variable IDA INTEGER;
declare variable MONTOA NUMERIC(18,2);
declare variable RTFTE NUMERIC(18,2);
declare variable RTIVA NUMERIC(18,2);
declare variable RTICA NUMERIC(18,2);
declare variable RCREE NUMERIC(18,2);
declare variable RTFTEA NUMERIC(18,2);
declare variable RTIVAA NUMERIC(18,2);
declare variable RTICAA NUMERIC(18,2);
declare variable RTCREA NUMERIC(18,2);
declare variable ITEMR INTEGER;
declare variable TRANSMIT CHAR(1);
declare variable antitot NUMERIC(18,2);
declare variable ABONO NUMERIC(18,2);
declare variable IVAMONTO NUMERIC(18,2);
declare variable DTOF NUMERIC(18,2);
declare variable ERROR INTEGER;
declare variable ID INTEGER;
begin
/* SI NO ES DE CARTERA GENERE UN RECIBO */
SELECT FOPA_CARTERA FROM formas_pago WHERE FOPA_ID = NEW.fopa_id INTO :CARTERA;
if (CARTERA = 'N') then
    BEGIN
    select F.PTVT_ID, P.caja_id, fact_fecha, F.pref_pre, fact_numero, F.terc_nit, fact_nomcliente, F.vend_cod, fact_total, fact_ivamonto,
        fact_sucursal, FACT_PEDIDO, FACT_TRANSMIT
        FROM FACTURAS F, PUNTO_VENTA P WHERE F.fact_id = NEW.fcnt_id AND F.PTVT_ID = P.ptvt_id
        INTO :PUNTO, :CAJA, :FECHA, :PREFF, :NUMF, :NIT, :NOMCLI, : VEND, :MONTO, :IVAMONTO,
        :SUCURSAL, :PEDIDO, :TRANSMIT;
    /* si la autorizacion es de contado, haga el recibo */
    select first 1 auto_contado, auto_prefrdc from autorizaciones where pref_pre = :preff into :contado, :prefr;
    if ((CONTADO = 'S') AND (TRANSMIT = 'N')) then
        BEGIN
        ANTITOT = 0;
        IDR = 0;
        SELECT FIRST 1 RECA_ID FROM RECIBOS_CAJA_DETALLE WHERE RCDE_TIPODOC = 31 AND RCDE_IDDOC = NEW.fcnt_id AND RCDE_ANULADO = 'N'
            INTO :IDR;
        if (IDR IS NULL) then
            IDR = 0;
        if (IDR = 0) then
            BEGIN
            execute procedure busca_id_doc_cartera(31, :preff, :numf, :nit, :fecha, 0)
                returning_values (:ID, :ABONO, :RTFTE, :RTIVA, :RTICA, :RCREE, :DTOF, :ERROR);

            SELECT PREF_ACTUAL FROM PREFIJOS WHERE PREF_PRE = :PREFR AND TIDO_COD = 61 INTO :NUMR;
            idr = gen_id(id_recicaja, 1);
            insert into recibos_caja (reca_id, caja_id, tido_cod, pref_pre, reca_numero, reca_fecha, reca_conc, reca_monto,
                reca_rtftemonto, reca_rtivamonto, reca_rticamonto, reca_rtcreem, reca_dtof, reca_obs, terc_nit, reca_nomterc, reca_anulado,
                reca_transmit, cobr_cod, numok)
                values (:idr, :caja, 61, :prefr, :numr, :fecha, 'CANCELA FACTURA ' || :preff || :NUMF || ' PUNTO ' || :punto, :MONTO,
                :rtfte, :rtiva, :rtica, :rcree, :dtof, NULL, :NIT, :nomcli, 'N', 'N', :vend, 'N');
            insert into recibos_caja_detalle (reca_id, rcde_item, rcde_tipodoc, rcde_iddoc, rcde_prefijo, rcde_numero, rcde_abono,
                rcde_rtfte, rcde_rtiva, rcde_rtica, rcde_rcree, rcde_dtof, rcde_anulado, rcde_transmit, rcde_comip, rcde_sucursal)
                values (:idr, 1, 31, NEW.fcnt_id, :preff, :numf, :MONTO, :rtfte, :rtiva, :rtica, :rcree, :dtof, 'N', 'N', '', :sucursal);
            END
        insert into recibos_caja_pago (reca_id, rcpa_item, fopa_id, rcpa_banco, rcpa_cuenta, rcpa_numero, rcpa_fecha, rcpa_monto,
            rcpa_anulado, rcpa_transmit, rcpa_ivamonto)
            values (:idr, NEW.fcnp_item, NEW.fopa_id, NEW.fcnp_banco, NEW.fcnp_cuenta, NEW.fcnp_numero, NEW.fcnp_fecha, (NEW.fcnp_monto-:antitot), 'N', 'N', :ivamonto);
        END

    END
end
`;

async function updateTrigger() {
  try {
    console.log('Updating trigger FACTURAS_CONTADO_PAGO_AI...');
    await db.raw(TRIGGER_SQL);
    console.log('TRIGGER FACTURAS_CONTADO_PAGO_AI UPDATED SUCCESSFULLY!');
  } catch (e: any) {
    console.error('ERROR UPDATING TRIGGER:', e.message);
  } finally {
    process.exit(0);
  }
}

updateTrigger();
