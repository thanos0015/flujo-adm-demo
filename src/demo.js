import { limaToday } from './domain.js';

// Datos ficticios. La demostración no se conecta con las cuentas privadas.
const month = limaToday().slice(0, 7);
const day = (number) => `${month}-${String(number).padStart(2, '0')}`;

export const demoAccounts = {
  vich: {
    profile: { nombre: 'Alex', tipo: 'vich', saldo_inicial: 750, saldo_inicial_yape: 600, saldo_inicial_plin: 150, fecha_inicio: day(1), ahorro_protegido: 100, sueldo_quincenal: 1200 },
    categories: [
      { id: 'CAT_SUELDO', nombre_categoria: 'Sueldo', tipo: 'INGRESO' },
      { id: 'CAT_OTRO_ING', nombre_categoria: 'Otros ingresos', tipo: 'INGRESO' },
      { id: 'CAT_IDAT', nombre_categoria: 'Educación', tipo: 'EGRESO' },
      { id: 'CAT_MOVILIDAD', nombre_categoria: 'Transporte', tipo: 'EGRESO' },
      { id: 'CAT_YAPE', nombre_categoria: 'Préstamo', tipo: 'EGRESO' },
      { id: 'CAT_ALIMENTACION', nombre_categoria: 'Alimentación', tipo: 'EGRESO' },
      { id: 'CAT_OTROS', nombre_categoria: 'Otros gastos', tipo: 'EGRESO' },
    ],
    debts: [
      { id: 'DEMO-CUOTA-01', entidad: 'Préstamo', cuota_nro: 1, monto_cuota: 120, fecha_vencimiento: day(20), estado_pago: 'PENDIENTE' },
    ],
    movements: [
      { id: 'A-1', fecha: day(2), tipo: 'INGRESO', id_categoria: 'CAT_OTRO_ING', monto: 180, categoria: 'Otros ingresos', metodo_pago: 'Yape', cuenta: 'Yape', nota: 'Venta de libros', estado: 'CONFIRMADO' },
      { id: 'A-2', fecha: day(3), tipo: 'EGRESO', id_categoria: 'CAT_ALIMENTACION', monto: 24, categoria: 'Alimentación', metodo_pago: 'Yape', cuenta: 'Yape', nota: 'Almuerzo', estado: 'CONFIRMADO' },
      { id: 'A-3', fecha: day(5), tipo: 'EGRESO', id_categoria: 'CAT_MOVILIDAD', monto: 32, categoria: 'Transporte', metodo_pago: 'Yape', cuenta: 'Yape', nota: 'Pasajes de la semana', estado: 'CONFIRMADO' },
      { id: 'A-4', fecha: day(8), tipo: 'EGRESO', id_categoria: 'CAT_IDAT', monto: 100, categoria: 'Educación', metodo_pago: 'BCP', cuenta: 'BCP', nota: 'Material del curso', estado: 'PENDIENTE' },
    ],
  },
  tami: {
    profile: { nombre: 'Sam', tipo: 'tami', fecha_inicio: day(1), saldo_inicial: 0 },
    categories: [
      { id: 'CAT_SUELDO', nombre_categoria: 'Sueldo', tipo: 'INGRESO' },
      { id: 'CAT_OTRO_ING', nombre_categoria: 'Otros ingresos', tipo: 'INGRESO' },
      ...[['CAT_ALIMENTACION', 'Alimentación'], ['CAT_MOVILIDAD', 'Transporte'], ['CAT_SERVICIOS', 'Servicios'], ['CAT_OTROS', 'Otros gastos'], ['CAT_VIVIENDA', 'Vivienda'], ['CAT_EDUCACION', 'Educación'], ['CAT_SALUD', 'Salud'], ['CAT_DEUDAS', 'Deudas'], ['CAT_ENTRETENIMIENTO', 'Entretenimiento']]
        .map(([id, nombre_categoria]) => ({ id, nombre_categoria, tipo: 'EGRESO' })),
    ],
    debts: [],
    movements: [
      { id: 'S-1', fecha: day(1), tipo: 'INGRESO', id_categoria: 'CAT_SUELDO', monto: 2200, categoria: 'Sueldo', metodo_pago: 'Transferencia', cuenta: 'BCP', nota: 'Sueldo del mes', estado: 'CONFIRMADO' },
      { id: 'S-2', fecha: day(2), tipo: 'EGRESO', id_categoria: 'CAT_VIVIENDA', monto: 650, categoria: 'Vivienda', metodo_pago: 'Transferencia', cuenta: 'BCP', nota: 'Alquiler', estado: 'CONFIRMADO' },
      { id: 'S-T', fecha: day(2), tipo: 'TRASPASO', id_categoria: 'TRASPASO', monto: 200, cuenta_origen: 'BCP', cuenta_destino: 'Yape', metodo_pago: 'BCP', nota: 'Dinero para compras', estado: 'CONFIRMADO' },
      { id: 'S-3', fecha: day(4), tipo: 'EGRESO', id_categoria: 'CAT_ALIMENTACION', monto: 75, categoria: 'Alimentación', metodo_pago: 'Yape', cuenta: 'Yape', nota: 'Compras del mercado', estado: 'CONFIRMADO' },
      { id: 'S-4', fecha: day(6), tipo: 'EGRESO', id_categoria: 'CAT_SERVICIOS', monto: 49, categoria: 'Servicios', metodo_pago: 'BCP', cuenta: 'BCP', nota: 'Internet', estado: 'CONFIRMADO' },
    ],
  },
};
