export const ACCOUNT_EMAILS = {
  vich: 'demo-alex@example.invalid',
  tami: 'demo-sam@example.invalid',
};

export const MONEY_ACCOUNTS = ['Yape', 'Plin', 'Efectivo', 'BCP'];
export const UNASSIGNED_ACCOUNT = 'Sin asignar';

export const CATEGORY_NAMES = {
  CAT_SUELDO: 'Sueldo', CAT_IDAT: 'Educación', CAT_MOVILIDAD: 'Transporte',
  CAT_YAPE: 'Préstamo', CAT_OTROS: 'Otros gastos', CAT_OTRO_ING: 'Otros ingresos',
  CAT_VIVIENDA: 'Vivienda', CAT_ALIMENTACION: 'Alimentación', CAT_EDUCACION: 'Educación',
  CAT_SERVICIOS: 'Servicios', CAT_SALUD: 'Salud', CAT_DEUDAS: 'Deudas',
  CAT_ENTRETENIMIENTO: 'Entretenimiento',
};

export const money = (value) => new Intl.NumberFormat('es-PE', {
  style: 'currency', currency: 'PEN', minimumFractionDigits: 2,
}).format(Number(value) || 0);

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export function limaToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const pick = (type) => parts.find((part) => part.type === type)?.value;
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

export function validDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}

export function periodKey(date) {
  if (!validDate(date)) throw new Error('Fecha inválida');
  return `${date.slice(0, 7)}-Q${Number(date.slice(8)) <= 15 ? 1 : 2}`;
}

export function monthKey(date) {
  if (!validDate(date)) throw new Error('Fecha inválida');
  return date.slice(0, 7);
}

export function periodBounds(key) {
  const match = /^(\d{4}-\d{2})-Q([12])$/.exec(key || '');
  if (!match) throw new Error('Quincena inválida');
  const end = new Date(Date.UTC(Number(match[1].slice(0, 4)), Number(match[1].slice(5)), 0))
    .toISOString().slice(0, 10);
  return { start: `${match[1]}-${match[2] === '1' ? '01' : '16'}`, end: match[2] === '1' ? `${match[1]}-15` : end };
}

export function periodLabel(key) {
  const { start, end } = periodBounds(key);
  const month = new Intl.DateTimeFormat('es-PE', { month: 'long', timeZone: 'UTC' }).format(new Date(`${start}T12:00:00Z`));
  return `${start.slice(8)}–${end.slice(8)} de ${month}`;
}

export function monthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  const label = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function activeMovements(movements) {
  return movements.filter((row) => row.estado === 'CONFIRMADO');
}

export function totals(movements) {
  const result = activeMovements(movements).reduce((acc, row) => {
    const amount = Number(row.monto) || 0;
    if (row.tipo === 'INGRESO') acc.income += amount;
    if (row.tipo === 'EGRESO') acc.expense += amount;
    return acc;
  }, { income: 0, expense: 0 });
  return { income: roundMoney(result.income), expense: roundMoney(result.expense) };
}

export function balancesByAccount(account, movements, endDate, settings = {}) {
  const balances = Object.fromEntries([...MONEY_ACCOUNTS, UNASSIGNED_ACCOUNT].map((name) => [name, 0]));
  const startDate = settings.fecha_inicio || '2026-10-01';
  if (endDate >= startDate) {
    const opening = Number(settings.saldo_inicial || 0);
    if (account === 'vich') {
      balances.Yape += Number(settings.saldo_inicial_yape || 0);
      balances.Plin += Number(settings.saldo_inicial_plin || 0);
      balances[UNASSIGNED_ACCOUNT] += opening - balances.Yape - balances.Plin;
    } else {
      balances[UNASSIGNED_ACCOUNT] += opening;
    }
  }
  for (const row of activeMovements(movements)) {
    if (row.fecha < startDate || row.fecha > endDate) continue;
    const amount = Number(row.monto || 0);
    if (row.tipo === 'TRASPASO') {
      if (!MONEY_ACCOUNTS.includes(row.cuenta_origen) || !MONEY_ACCOUNTS.includes(row.cuenta_destino)) continue;
      balances[row.cuenta_origen] -= amount;
      balances[row.cuenta_destino] += amount;
    } else {
      const chosen = row.cuenta || row.metodo_pago;
      const name = MONEY_ACCOUNTS.includes(chosen) ? chosen : UNASSIGNED_ACCOUNT;
      if (row.tipo === 'INGRESO') balances[name] += amount;
      if (row.tipo === 'EGRESO') balances[name] -= amount;
    }
  }
  return Object.fromEntries(Object.entries(balances).map(([name, amount]) => [name, roundMoney(amount)]));
}

export function categoryExpenses(movements) {
  return Object.entries(activeMovements(movements).filter((row) => row.tipo === 'EGRESO')
    .reduce((acc, row) => {
      const name = CATEGORY_NAMES[row.id_categoria] || row.categoria || 'Otros gastos';
      acc[name] = (acc[name] || 0) + Number(row.monto || 0);
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]);
}

export function trendSeries(movements, selectedKey, count = 6) {
  const quincenal = selectedKey.includes('-Q');
  const keys = [selectedKey];
  while (keys.length < count) {
    const current = keys[0];
    const previous = quincenal
      ? new Date(`${periodBounds(current).start}T12:00:00Z`)
      : new Date(`${current}-01T12:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);
    const date = previous.toISOString().slice(0, 10);
    keys.unshift(quincenal ? periodKey(date) : monthKey(date));
  }
  return keys.map((key) => {
    const bounds = quincenal ? periodBounds(key) : { start: `${key}-01`, end: `${key}-31` };
    const month = new Intl.DateTimeFormat('es-PE', { month: 'short', timeZone: 'UTC' })
      .format(new Date(`${bounds.start}T12:00:00Z`)).replace(/\.$/, '');
    const { income, expense } = totals(movements.filter((row) => row.fecha >= bounds.start && row.fecha <= bounds.end));
    return { key, label: quincenal ? `${key.endsWith('Q1') ? '1' : '2'} ${month}` : month, income, expense };
  });
}

function searchText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function filterMovements(movements, filters = {}) {
  const query = searchText(filters.query).trim();
  return movements.filter((row) => {
    if (filters.type && row.tipo !== filters.type) return false;
    if (filters.status && row.estado !== filters.status) return false;
    if (filters.month && row.fecha.slice(0, 7) !== filters.month) return false;
    const account = row.cuenta || (MONEY_ACCOUNTS.includes(row.metodo_pago) ? row.metodo_pago : UNASSIGNED_ACCOUNT);
    if (filters.account && (row.tipo === 'TRASPASO'
      ? row.cuenta_origen !== filters.account && row.cuenta_destino !== filters.account
      : account !== filters.account)) return false;
    if (!query) return true;
    const haystack = [row.nota, row.categoria, CATEGORY_NAMES[row.id_categoria], row.metodo_pago,
      row.cuenta, row.cuenta_origen, row.cuenta_destino, row.monto].map(searchText).join(' ');
    return haystack.includes(query);
  });
}

function halfMonthsDue(startDate, endDate) {
  if (endDate < startDate) return 0;
  let count = 0;
  const [startYear, startMonth] = startDate.slice(0, 7).split('-').map(Number);
  const [endYear, endMonth] = endDate.slice(0, 7).split('-').map(Number);
  for (let year = startYear, month = startMonth; year < endYear || (year === endYear && month <= endMonth);) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const lastDay = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    if (`${prefix}-15` >= startDate && `${prefix}-15` <= endDate) count++;
    if (lastDay >= startDate && lastDay <= endDate) count++;
    if (++month === 13) { year++; month = 1; }
  }
  return count;
}

export function summaryFor(account, movements, selectedKey, settings = {}, debts = []) {
  const isVich = account === 'vich';
  const isQuincena = selectedKey.includes('-Q');
  const bounds = isQuincena ? periodBounds(selectedKey) : { start: `${selectedKey}-01`, end: `${selectedKey}-31` };
  const inView = movements.filter((row) => row.fecha >= bounds.start && row.fecha <= bounds.end);
  const { income, expense } = totals(inView);
  const startDate = settings.fecha_inicio || '2026-10-01';
  const throughEnd = movements.filter((row) => row.fecha <= bounds.end && row.fecha >= startDate);
  const allBeforeEnd = totals(throughEnd);
  const opening = bounds.end >= startDate ? Number(settings.saldo_inicial || 0) : 0;
  const balance = roundMoney(opening + allBeforeEnd.income - allBeforeEnd.expense);
  const accountBalances = balancesByAccount(account, movements, bounds.end, settings);
  const expensesByCategory = categoryExpenses(inView);
  const salaryExpected = isVich && isQuincena && bounds.end >= startDate
    ? Number(settings.sueldo_quincenal ?? 900) : 0;
  const salaryReceived = inView.filter((row) => row.estado === 'CONFIRMADO' && row.tipo === 'INGRESO' && row.id_categoria === 'CAT_SUELDO')
    .reduce((sum, row) => sum + Number(row.monto || 0), 0);
  const salaryRemaining = roundMoney(Math.max(0, salaryExpected - salaryReceived));
  let idatReserve = 0; let transportReserve = 0; let debtReserve = 0;
  let idatPaid = 0; let transportPaid = 0; let debtPaid = 0;
  if (isVich && isQuincena) {
    idatPaid = throughEnd.filter((row) => row.estado === 'CONFIRMADO' && row.tipo === 'EGRESO' && row.id_categoria === 'CAT_IDAT')
      .reduce((sum, row) => sum + Number(row.monto || 0), 0);
    transportPaid = inView.filter((row) => row.estado === 'CONFIRMADO' && row.tipo === 'EGRESO' && row.id_categoria === 'CAT_MOVILIDAD')
      .reduce((sum, row) => sum + Number(row.monto || 0), 0);
    idatReserve = Math.max(0, 250 * halfMonthsDue(startDate, bounds.end) - idatPaid);
    transportReserve = bounds.end >= startDate ? Math.max(0, 180 - transportPaid) : 0;
    const debtDue = debts.filter((debt) => debt.estado_pago === 'PENDIENTE' && debt.fecha_vencimiento >= startDate && debt.fecha_vencimiento <= bounds.end)
      .reduce((sum, debt) => sum + Number(debt.monto_cuota || 0), 0);
    debtPaid = throughEnd.filter((row) => row.estado === 'CONFIRMADO' && row.tipo === 'EGRESO' && row.id_categoria === 'CAT_YAPE')
      .reduce((sum, row) => sum + Number(row.monto || 0), 0);
    debtReserve = Math.max(0, debtDue - debtPaid);
  }
  const savings = isVich && bounds.end >= startDate ? Number(settings.ahorro_protegido || 0) : 0;
  const committed = roundMoney(idatReserve + transportReserve + debtReserve);
  return {
    inView, income, expense, balance, accountBalances, committed, savings,
    salaryExpected: roundMoney(salaryExpected), salaryReceived: roundMoney(salaryReceived), salaryRemaining,
    idatReserve: roundMoney(idatReserve), transportReserve: roundMoney(transportReserve), debtReserve: roundMoney(debtReserve),
    idatPaid: roundMoney(idatPaid), transportPaid: roundMoney(transportPaid), debtPaid: roundMoney(debtPaid),
    free: roundMoney(balance - committed - savings),
    expensesByCategory,
    pending: inView.filter((row) => row.estado === 'PENDIENTE'),
  };
}

export function normalizeMovement(input) {
  const monto = Number(input.monto);
  if (!validDate(input.fecha)) throw new Error('Elige una fecha válida.');
  if (!['INGRESO', 'EGRESO', 'TRASPASO'].includes(input.tipo)) throw new Error('Elige un tipo de movimiento.');
  if (!Number.isFinite(monto) || monto <= 0 || monto > 1000000) throw new Error('Ingresa un monto mayor que cero.');
  if (input.tipo === 'TRASPASO') {
    if (!MONEY_ACCOUNTS.includes(input.cuenta_origen) || !MONEY_ACCOUNTS.includes(input.cuenta_destino) || input.cuenta_origen === input.cuenta_destino) {
      throw new Error('Elige dos cuentas diferentes para el traspaso.');
    }
    return {
      fecha: input.fecha, tipo: 'TRASPASO', id_categoria: 'TRASPASO', categoria: 'Entre mis cuentas',
      monto: Math.round(monto * 100) / 100, metodo_pago: 'Transferencia',
      cuenta_origen: input.cuenta_origen, cuenta_destino: input.cuenta_destino,
      nota: String(input.nota || '').trim().slice(0, 300),
      estado: input.estado === 'PENDIENTE' ? 'PENDIENTE' : 'CONFIRMADO',
      periodo_quincena: periodKey(input.fecha), mes: monthKey(input.fecha),
    };
  }
  if (!input.id_categoria) throw new Error('Elige una categoría.');
  if (!input.metodo_pago) throw new Error('Elige un medio de pago.');
  if (!MONEY_ACCOUNTS.includes(input.cuenta)) throw new Error('Elige en qué cuenta entró o salió el dinero.');
  return {
    fecha: input.fecha, tipo: input.tipo, id_categoria: input.id_categoria,
    categoria: CATEGORY_NAMES[input.id_categoria] || input.categoria || 'Otros',
    monto: Math.round(monto * 100) / 100,
    metodo_pago: input.metodo_pago,
    cuenta: input.cuenta,
    nota: String(input.nota || '').trim().slice(0, 300),
    estado: input.estado === 'PENDIENTE' ? 'PENDIENTE' : 'CONFIRMADO',
    periodo_quincena: periodKey(input.fecha), mes: monthKey(input.fecha),
  };
}
