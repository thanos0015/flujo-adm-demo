import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDownLeft, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, CreditCard, LayoutDashboard, LogOut, Menu, Plus, Search, ShieldCheck, Sparkles, Wallet, X } from 'lucide-react';
import { ACCOUNT_EMAILS, CATEGORY_NAMES, MONEY_ACCOUNTS, UNASSIGNED_ACCOUNT, filterMovements, limaToday, money, monthKey, monthLabel, normalizeMovement, periodBounds, periodKey, periodLabel, summaryFor, trendSeries } from './domain.js';
import { configured, login, logout, saveMovement, watchAccount, watchAuth } from './firebase.js';
import './style.css';

const METHODS = ['Yape', 'Plin', 'Efectivo', 'BCP', 'Débito', 'Transferencia', 'Otro'];
const DEMO = true;
const DEMO_STORAGE_KEY = 'flujo-adm-public-demo-v1';
const today = limaToday();

function shiftMonth(value, count) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + count, 1)).toISOString().slice(0, 7);
}

function shiftQuincena(value, count) {
  const [month, half] = value.split('-Q');
  if (count > 0) return half === '1' ? `${month}-Q2` : `${shiftMonth(month, 1)}-Q1`;
  return half === '2' ? `${month}-Q1` : `${shiftMonth(month, -1)}-Q2`;
}

function prettyDate(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

function Logo() {
  return <span className="logo"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M4 25h8l5-16 8 23 5-13h6" /></svg></span>;
}

function IconFor({ row }) {
  return <span className={`transaction-icon ${row.tipo === 'INGRESO' ? 'income' : 'expense'}`}>
    {row.tipo === 'TRASPASO' ? <ArrowRight size={20} /> : row.tipo === 'INGRESO' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
  </span>;
}

function MovementForm({ account, categories, initial, defaultType = 'EGRESO', onClose, onSave }) {
  const [form, setForm] = useState(initial ? {
    fecha: initial.fecha, tipo: initial.tipo, id_categoria: initial.id_categoria,
    monto: String(initial.monto), metodo_pago: initial.metodo_pago,
    cuenta: initial.cuenta || (MONEY_ACCOUNTS.includes(initial.metodo_pago) ? initial.metodo_pago : ''),
    cuenta_origen: initial.cuenta_origen || 'Yape', cuenta_destino: initial.cuenta_destino || 'Plin',
    nota: initial.nota || '', estado: initial.estado,
  } : { fecha: today, tipo: defaultType, id_categoria: defaultType === 'TRASPASO' ? 'TRASPASO' : '', monto: '', metodo_pago: 'Yape', cuenta: 'Yape', cuenta_origen: 'Yape', cuenta_destino: 'Plin', nota: '', estado: 'CONFIRMADO' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const choices = categories.filter((category) => category.tipo === form.tipo);
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      setBusy(true);
      await onSave(normalizeMovement(form), initial?.id);
      onClose();
    } catch (caught) { setError(caught.message || 'No se pudo guardar.'); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="sheet" role="dialog" aria-modal="true" aria-label={initial ? 'Editar movimiento' : 'Nuevo movimiento'}>
      <div className="sheet-grip" />
      <div className="sheet-head"><div><span className="eyebrow">{account === 'vich' ? 'FLUJO DE ALEX' : 'FLUJO DE SAM'}</span><h2>{initial ? 'Editar movimiento' : 'Nuevo movimiento'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
      <form onSubmit={submit}>
        <div className="segmented large"><button type="button" className={form.tipo === 'EGRESO' ? 'selected expense-tab' : ''} onClick={() => setForm((old) => ({ ...old, tipo: 'EGRESO', id_categoria: '' }))}><ArrowUpRight size={18} /> Gasto</button><button type="button" className={form.tipo === 'INGRESO' ? 'selected income-tab' : ''} onClick={() => setForm((old) => ({ ...old, tipo: 'INGRESO', id_categoria: '' }))}><ArrowDownLeft size={18} /> Ingreso</button><button type="button" className={form.tipo === 'TRASPASO' ? 'selected income-tab' : ''} onClick={() => setForm((old) => ({ ...old, tipo: 'TRASPASO', id_categoria: 'TRASPASO' }))}>Entre cuentas</button></div>
        <label className="form-label">Monto en soles<div className="amount-input"><span>S/</span><input inputMode="decimal" type="number" min="0.01" max="1000000" step="0.01" required autoFocus value={form.monto} onChange={(event) => change('monto', event.target.value)} placeholder="0.00" /></div></label>
        <div className="form-grid"><label className="form-label">Fecha<input type="date" required value={form.fecha} onChange={(event) => change('fecha', event.target.value)} /></label>{form.tipo === 'TRASPASO' ? <label className="form-label">Desde<select value={form.cuenta_origen} onChange={(event) => change('cuenta_origen', event.target.value)}>{MONEY_ACCOUNTS.map((name) => <option key={name}>{name}</option>)}</select></label> : <label className="form-label">Medio de pago<select value={form.metodo_pago} onChange={(event) => setForm((old) => ({ ...old, metodo_pago: event.target.value, cuenta: MONEY_ACCOUNTS.includes(event.target.value) ? event.target.value : old.cuenta }))}>{METHODS.map((method) => <option key={method}>{method}</option>)}</select></label>}</div>
        {form.tipo === 'TRASPASO' ? <label className="form-label">Hacia<select value={form.cuenta_destino} onChange={(event) => change('cuenta_destino', event.target.value)}>{MONEY_ACCOUNTS.map((name) => <option key={name}>{name}</option>)}</select></label> : <><label className="form-label">Cuenta donde está el dinero<select required value={form.cuenta} onChange={(event) => change('cuenta', event.target.value)}><option value="">Seleccionar cuenta</option>{MONEY_ACCOUNTS.map((name) => <option key={name}>{name}</option>)}</select></label><label className="form-label">Categoría<select required value={form.id_categoria} onChange={(event) => change('id_categoria', event.target.value)}><option value="">Seleccionar categoría</option>{choices.map((category) => <option value={category.id} key={category.id}>{category.nombre_categoria || CATEGORY_NAMES[category.id] || category.id}</option>)}</select></label></>}
        <label className="form-label">Descripción (opcional)<input maxLength={300} value={form.nota} onChange={(event) => change('nota', event.target.value)} placeholder="Ej. Almuerzo, pasajes, sueldo…" /></label>
        <label className="form-label">Estado<select value={form.estado} onChange={(event) => change('estado', event.target.value)}><option value="CONFIRMADO">Confirmado · cuenta en el saldo</option><option value="PENDIENTE">Pendiente · aún no cuenta</option></select></label>
        {error && <p className="error-message" role="alert">{error}</p>}
        <button className="primary-button save" disabled={busy}>{busy ? 'Guardando…' : initial ? 'Guardar cambios' : 'Guardar movimiento'} <Check size={19} /></button>
      </form>
    </div>
  </div>;
}

function DemoLogin({ onChoose }) {
  return <div className="login-screen"><div className="login-decor one" /><div className="login-decor two" /><div className="login-content"><Logo /><div className="login-copy"><span className="eyebrow light">DEMO PÚBLICA DE FLUJO ADM</span><h1>Tu dinero,<br /><em>más claro.</em></h1><p>Prueba el control quincenal y mensual con ejemplos ficticios.</p></div><div className="login-card demo-login-card"><strong>Elige una vista para probar</strong><p>Agrega ingresos o gastos y revisa los gráficos. Tus cambios se guardan solo en este navegador; esta demo no usa cuentas ni datos reales.</p><button onClick={() => onChoose('vich')}><span className="avatar vich">A</span><span><b>Alex</b><small>Flujo quincenal y mensual</small></span><ArrowRight size={18} /></button><button onClick={() => onChoose('tami')}><span className="avatar tami">S</span><span><b>Sam</b><small>Gastos y resumen mensual</small></span><ArrowRight size={18} /></button></div><small><CircleHelp size={15} /> Usa importes de prueba: la demo no es una cuenta privada.</small></div></div>;
}

function FlowBars({ series, mode }) {
  const max = Math.max(0, ...series.flatMap((item) => [item.income, item.expense]));
  const scale = max || 1;
  const anyActivity = series.some((item) => item.income > 0 || item.expense > 0);
  return <section className="surface chart-card"><div className="section-title"><div><span className="eyebrow">EVOLUCIÓN</span><h2>Ingresos y gastos</h2></div><span className="chart-period">{mode === 'quincena' ? 'Últimas 6 quincenas' : 'Últimos 6 meses'}</span></div>
    <div className="chart-legend"><span><i className="legend-dot income" />Ingresos</span><span><i className="legend-dot expense" />Gastos</span></div>
    <div className="chart-body" role="img" aria-label={series.map((item) => `${item.label}: ingresos ${money(item.income)}, gastos ${money(item.expense)}`).join('; ')}><div className="chart-y-labels"><span>{max > 0 ? money(max) : ''}</span><span>{max > 0 ? money(max / 2) : ''}</span><span>S/ 0</span></div><div className="chart-main"><div className="chart-plot"><div className="chart-line top" /><div className="chart-line middle" /><div className="chart-line bottom" /><div className="chart-columns">{series.map((item, index) => <div className={`chart-column ${index === series.length - 1 ? 'current' : ''}`} key={item.key}><div className="chart-pair"><span className="chart-bar income" style={{ height: `${100 * item.income / scale}%` }} title={`${item.label} · ingresos ${money(item.income)}`} /><span className="chart-bar expense" style={{ height: `${100 * item.expense / scale}%` }} title={`${item.label} · gastos ${money(item.expense)}`} /></div></div>)}</div>{!anyActivity && <span className="chart-empty">Registra movimientos para ver tu evolución</span>}</div><div className="chart-x-labels">{series.map((item) => <span key={item.key}>{item.label}</span>)}</div></div></div>
    <p className="chart-footnote">Solo movimientos confirmados. Los sueldos previstos no se incluyen.</p>
  </section>;
}

function CommitmentBars({ summary }) {
  const items = [
    { label: 'Educación', paid: summary.idatPaid, remaining: summary.idatReserve },
    { label: 'Transporte', paid: summary.transportPaid, remaining: summary.transportReserve },
    { label: 'Préstamo', paid: summary.debtPaid, remaining: summary.debtReserve },
  ].filter((item) => item.paid + item.remaining > 0);
  return <div className="commitment-bars"><div className="commitment-legend"><span><i className="legend-dot income" />Pagado</span><span><i className="legend-dot pending" />Pendiente</span></div>{items.map((item) => { const total = item.paid + item.remaining; return <div className="commitment-bar" key={item.label}><div className="commitment-bar-label"><strong>{item.label}</strong><span>{money(item.paid)} pagado · {money(item.remaining)} pendiente</span></div><div className="commitment-track" role="progressbar" aria-label={`${item.label} pagado`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={item.paid}><span style={{ width: `${100 * item.paid / total}%` }} /></div></div>; })}</div>;
}

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(DEMO);
  const [authError, setAuthError] = useState('');
  const [accountData, setAccountData] = useState(null);
  const [demoAccounts, setDemoAccounts] = useState(null);
  const [demoAccount, setDemoAccount] = useState(null);
  const [tab, setTab] = useState('home');
  const [view, setView] = useState('quincena');
  const [selectedMonth, setSelectedMonth] = useState(monthKey(today));
  const [selectedPeriod, setSelectedPeriod] = useState(periodKey(today));
  const [formRow, setFormRow] = useState(undefined);
  const [formType, setFormType] = useState('EGRESO');
  const [showForm, setShowForm] = useState(false);
  const [savingError, setSavingError] = useState('');

  useEffect(() => {
    if (DEMO) {
      import('./demo.js').then((module) => {
        const initial = structuredClone(module.demoAccounts);
        try {
          const saved = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || 'null');
          for (const key of ['vich', 'tami']) {
            if (Array.isArray(saved?.[key]) && saved[key].every((row) => row && typeof row.id === 'string' && typeof row.fecha === 'string')) {
              initial[key].movements = saved[key];
            }
          }
        } catch { /* El navegador puede bloquear el almacenamiento. */ }
        setDemoAccounts(initial);
      });
      return;
    }
    return watchAuth((nextUser, error) => { setUser(nextUser); setAuthReady(true); if (error) setAuthError(error.message); });
  }, []);
  useEffect(() => {
    if (!DEMO || !demoAccounts) return;
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({
        vich: demoAccounts.vich.movements,
        tami: demoAccounts.tami.movements,
      }));
    } catch { /* La demo sigue funcionando durante esta sesión. */ }
  }, [demoAccounts]);
  useEffect(() => {
    if (DEMO) return;
    if (DEMO ? !demoAccount : !user) return;
    let timer;
    let hiddenAt = 0;
    const leave = () => { if (DEMO) setDemoAccount(null); else logout().catch(() => {}); };
    const reset = () => { clearTimeout(timer); timer = setTimeout(leave, 5 * 60 * 1000); };
    const visibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt >= 5 * 60 * 1000) leave();
      else reset();
    };
    for (const name of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(name, reset, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    reset();
    return () => { clearTimeout(timer); for (const name of ['pointerdown', 'keydown', 'touchstart']) window.removeEventListener(name, reset); document.removeEventListener('visibilitychange', visibility); };
  }, [user?.uid, demoAccount]);
  const account = DEMO ? demoAccount : Object.entries(ACCOUNT_EMAILS).find(([, email]) => email === user?.email?.toLowerCase())?.[0];
  useEffect(() => {
    if (DEMO || !user || !account) { setAccountData(null); return; }
    return watchAccount(user.uid, setAccountData, (error) => setSavingError(error.message));
  }, [user?.uid, account]);
  const data = DEMO ? demoAccounts?.[account] : accountData;
  const isVich = account === 'vich';
  const effectiveView = isVich ? view : 'mes';
  const selectedKey = effectiveView === 'quincena' ? selectedPeriod : selectedMonth;
  const summary = useMemo(() => data ? summaryFor(account, data.movements, selectedKey, data.profile || {}, data.debts || []) : null, [data, account, selectedKey]);
  const trend = useMemo(() => data ? trendSeries(data.movements, selectedKey) : [], [data, selectedKey]);
  const sortedRows = useMemo(() => (data?.movements || []).slice().sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.creado?.seconds || 0) - (a.creado?.seconds || 0)), [data]);
  const shownRows = sortedRows.filter((row) => effectiveView === 'quincena' ? periodKey(row.fecha) === selectedPeriod : monthKey(row.fecha) === selectedMonth);
  const displayName = data?.profile?.nombre || (isVich ? 'Alex' : 'Sam');

  async function resetDemo() {
    if (!window.confirm('¿Restablecer todos los movimientos de ejemplo de este navegador?')) return;
    const module = await import('./demo.js');
    try { localStorage.removeItem(DEMO_STORAGE_KEY); } catch { /* Puede estar deshabilitado. */ }
    setDemoAccounts(structuredClone(module.demoAccounts));
    setSelectedMonth(monthKey(today));
    setSelectedPeriod(periodKey(today));
    setTab('home');
  }

  async function handleSave(movement, id) {
    if (DEMO) {
      setDemoAccounts((old) => ({ ...old, [account]: { ...old[account], movements: id
        ? old[account].movements.map((row) => row.id === id ? { ...row, ...movement } : row)
        : [{ id: crypto.randomUUID(), ...movement }, ...old[account].movements] } }));
    } else { await saveMovement(user.uid, movement, id); }
  }

  function openForm(row, type = 'EGRESO') { setFormRow(row); setFormType(type); setShowForm(true); }
  function navigatePeriod(amount) { if (effectiveView === 'quincena') setSelectedPeriod(shiftQuincena(selectedPeriod, amount)); else setSelectedMonth(shiftMonth(selectedMonth, amount)); }

  if (!authReady) return <div className="center-screen"><Logo /><p>Cargando tu flujo…</p></div>;
  if (!DEMO && !configured) return <div className="center-screen setup"><Logo /><h1>Flujo está en preparación</h1><p>La interfaz está lista. Falta vincular el proyecto Firebase para activar el acceso y guardar los movimientos.</p></div>;
  if (!DEMO && !user) return <div className="login-screen"><div className="login-decor one" /><div className="login-decor two" /><div className="login-content"><Logo /><div className="login-copy"><span className="eyebrow light">TU DINERO, MÁS CLARO</span><h1>Todo tu flujo<br /><em>en un solo lugar.</em></h1><p>Registra tus ingresos y gastos, revisa tu saldo y decide con calma qué viene después.</p></div><div className="login-card"><div className="login-avatars"><span>V</span><span>T</span></div><strong>Dos cuentas. Un mismo teléfono.</strong><p>Entra con tu Google y verás solo tus movimientos.</p><button className="google-button" onClick={() => login().catch((error) => setAuthError(error.message))}><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.79 7.18l7.73 6C44.39 38.03 46.98 31.88 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.77-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.87.93 7.51 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.91-2.13 15.88-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.15 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.5 42.62 14.62 48 24 48z"/></svg> Continuar con Google</button>{authError && <p className="error-message">{authError}</p>}</div><small><ShieldCheck size={15} /> Acceso exclusivo para Alex y Sam</small></div></div>;
  if (DEMO && !demoAccount) return <DemoLogin onChoose={(choice) => { setDemoAccount(choice); setTab('home'); }} />;
  if (!DEMO && !account) return <div className="center-screen setup"><ShieldCheck size={40} /><h1>Cuenta sin acceso</h1><p>Iniciaste sesión como {user.email}. Usa una de las dos cuentas autorizadas.</p><button className="primary-button" onClick={logout}>Cambiar de cuenta</button></div>;
  if (!data) return <div className="center-screen setup"><Logo /><h1>Preparando tu cuenta</h1><p>{savingError || 'Tus datos aparecerán aquí cuando se complete la importación inicial.'}</p><button className="secondary-button" onClick={logout}>Cambiar de cuenta</button></div>;
  if (!data.profile && !DEMO) return <div className="center-screen setup"><Logo /><h1>Falta importar tus datos</h1><p>La cuenta ya tiene acceso. Estoy preparando tus movimientos y saldos iniciales.</p><button className="secondary-button" onClick={logout}>Cerrar sesión</button></div>;

  return <div className="app-shell"><aside className="desktop-sidebar"><div className="brand"><Logo /><span>flujo<span className="brand-dot">.</span></span></div><div className="sidebar-label">MI ESPACIO</div><button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><LayoutDashboard size={19} /> Resumen</button><button className={tab === 'movements' ? 'active' : ''} onClick={() => setTab('movements')}><CreditCard size={19} /> Movimientos</button><button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><CircleHelp size={19} /> Mi cuenta</button><div className="sidebar-footer"><span className={`avatar ${account}`}>{displayName.charAt(0)}</span><span>{displayName}<small>Cuenta personal</small></span></div></aside>
    <main className="main-area"><div className="mobile-top"><div className="brand"><Logo /><span>flujo<span className="brand-dot">.</span></span></div><button className="avatar-button" onClick={() => setTab('profile')} aria-label="Mi cuenta"><span className={`avatar ${account}`}>{displayName.charAt(0)}</span></button></div>
      {DEMO && <div className="demo-banner"><Sparkles size={15} /> Demo pública · datos solo en este navegador <button onClick={resetDemo}>Reiniciar</button><button onClick={() => setDemoAccount(null)}><LogOut size={14} /> Cambiar vista</button></div>}
      <div className="content">
        {tab === 'home' && <><header className="page-heading"><div><span className="eyebrow">{isVich ? 'TU FLUJO PERSONAL' : 'TUS GASTOS MENSUALES'}</span><h1>Hola, {displayName} <span className="wave">✳</span></h1><p>Así va tu dinero en este momento.</p></div><button className="desktop-add primary-button" onClick={() => openForm()}><Plus size={19} /> Nuevo movimiento</button></header>
          {isVich && <div className="view-toggle"><button className={effectiveView === 'quincena' ? 'active' : ''} onClick={() => setView('quincena')}>Quincenal</button><button className={effectiveView === 'mes' ? 'active' : ''} onClick={() => setView('mes')}>Mensual</button></div>}
          <div className="period-strip"><button onClick={() => navigatePeriod(-1)} aria-label="Período anterior"><ChevronLeft size={20} /></button><div><CalendarDays size={17} /><span>{effectiveView === 'quincena' ? periodLabel(selectedPeriod) : monthLabel(selectedMonth)}</span></div><button onClick={() => navigatePeriod(1)} aria-label="Período siguiente"><ChevronRight size={20} /></button></div>
          <section className="balance-hero"><div className="hero-top"><span>Disponible según registros</span><span className="hero-spark"><Sparkles size={18} /></span></div><div className="hero-amount">{money(isVich && effectiveView === 'quincena' ? summary.free : summary.balance)}</div><p>{isVich && effectiveView === 'quincena' ? 'Después de separar educación, transporte, préstamo y ahorro' : 'Saldo acumulado con movimientos confirmados'}</p><div className="hero-rule" /><div className="hero-bottom"><span><ShieldCheck size={16} /> Solo cuenta lo confirmado</span><span>Período seleccionado</span></div></section>
          <section className="metric-grid"><div className="metric income"><span className="metric-icon"><ArrowDownLeft size={18} /></span><span>Ingresos</span><strong>{money(summary.income)}</strong><small>en este período</small></div><div className="metric expense"><span className="metric-icon"><ArrowUpRight size={18} /></span><span>Gastos</span><strong>{money(summary.expense)}</strong><small>en este período</small></div></section>
          <section className="quick-actions" aria-label="Registrar movimiento"><button onClick={() => openForm(undefined, 'EGRESO')}><span className="quick-icon expense"><ArrowUpRight size={19} /></span><span>Nuevo gasto</span><ArrowRight size={15} /></button><button onClick={() => openForm(undefined, 'INGRESO')}><span className="quick-icon income"><ArrowDownLeft size={19} /></span><span>Nuevo ingreso</span><ArrowRight size={15} /></button><button onClick={() => openForm(undefined, 'TRASPASO')}><span className="quick-icon transfer"><ArrowLeftRight size={19} /></span><span>Entre cuentas</span><ArrowRight size={15} /></button></section>
          <FlowBars series={trend} mode={effectiveView} />
          <section className="account-card"><div className="section-title"><div><span className="eyebrow">TUS CUENTAS</span><h2>Dónde está tu dinero</h2></div><Wallet size={20} /></div><p>Saldos acumulados hasta el fin del período. Solo cuentan movimientos confirmados.</p><div className="account-grid">{MONEY_ACCOUNTS.map((name) => <div className="account-tile" key={name}><span>{name}</span><strong>{money(summary.accountBalances[name])}</strong></div>)}{Math.abs(summary.accountBalances[UNASSIGNED_ACCOUNT]) >= 0.005 && <div className="account-tile unassigned"><span>Sin asignar</span><strong>{money(summary.accountBalances[UNASSIGNED_ACCOUNT])}</strong><small>Edita el movimiento y elige su cuenta.</small></div>}</div></section>
          {isVich && effectiveView === 'quincena' && summary.salaryExpected > 0 && <section className="expected-card"><span className="expected-icon"><CalendarDays size={20} /></span><div className="expected-copy"><span className="eyebrow">PLAN DE INGRESOS</span><h2>{summary.salaryRemaining > 0 ? 'Sueldo por recibir' : 'Sueldo registrado'}</h2><p>{summary.salaryRemaining > 0 ? `Esperado el ${prettyDate(periodBounds(selectedPeriod).end).replace(/\.$/, '')}. Regístralo cuando llegue.` : 'Ya se incluyó en los ingresos confirmados.'}</p></div><strong>{money(summary.salaryRemaining > 0 ? summary.salaryRemaining : summary.salaryReceived)}</strong></section>}
          {isVich && effectiveView === 'quincena' && <section className="commitment-card"><div className="section-title"><div><span className="eyebrow">PLAN QUINCENAL</span><h2>Compromisos</h2></div><Wallet size={20} /></div><CommitmentBars summary={summary} /><div className="commitment-row"><span>Ahorro protegido</span><strong>{money(summary.savings)}</strong></div><div className="commitment-total"><span>Libre para otros gastos</span><strong>{money(summary.free)}</strong></div>{summary.free < 0 && <div className="alert">Faltan {money(-summary.free)} para cubrir tus compromisos y el ahorro protegido.</div>}</section>}
          <div className="two-column"><section className="surface"><div className="section-title"><div><span className="eyebrow">DÓNDE SE FUE</span><h2>Gastos por categoría</h2></div></div>{summary.expensesByCategory.length ? <div className="bars">{summary.expensesByCategory.slice(0, 5).map(([name, amount], index) => <div className="bar-row" key={name}><div><span>{name}</span><strong>{money(amount)}</strong></div><div className="bar-track"><span style={{ width: `${Math.max(5, 100 * amount / summary.expense)}%`, background: ['#49bea0', '#f5a585', '#8a9dd3', '#e9ba67', '#93c9c5'][index] }} /></div></div>)}</div> : <div className="empty-small">Aún no hay gastos confirmados en este período.</div>}</section><section className="surface latest"><div className="section-title"><div><span className="eyebrow">ACTIVIDAD RECIENTE</span><h2>Últimos movimientos</h2></div><button className="text-link" onClick={() => setTab('movements')}>Ver todos <ArrowRight size={15} /></button></div><MovementList rows={shownRows.slice(0, 4)} onEdit={openForm} /></section></div>
          {summary.pending.length > 0 && <div className="pending-note"><Clock3 size={18} /><div><strong>{summary.pending.length} movimiento{summary.pending.length === 1 ? '' : 's'} pendiente{summary.pending.length === 1 ? '' : 's'}</strong><span>No se suma al saldo hasta confirmarse.</span></div></div>}
        </>}
        {tab === 'movements' && <><header className="page-heading"><div><span className="eyebrow">HISTORIAL</span><h1>Movimientos</h1><p>Encuentra y revisa cada operación.</p></div><button className="desktop-add primary-button" onClick={() => openForm()}><Plus size={19} /> Nuevo movimiento</button></header><HistoryPanel rows={sortedRows} onEdit={openForm} onAdd={() => openForm()} /></>}
        {tab === 'profile' && <><header className="page-heading"><div><span className="eyebrow">TU ESPACIO</span><h1>Mi cuenta</h1><p>Un lugar privado para llevar tu dinero.</p></div></header><section className="profile-card"><span className={`avatar big ${account}`}>{displayName.charAt(0)}</span><div><strong>{displayName}</strong><span>{DEMO ? 'Vista previa' : user.email}</span></div><ShieldCheck size={20} /></section><section className="surface help-card"><div className="section-title"><div><span className="eyebrow">AYUDA RÁPIDA</span><h2>Cómo usar Flujo</h2></div></div><div className="help-row"><span>01</span><div><strong>Registra cada movimiento</strong><p>Usa “Agregar” para apuntar un gasto o ingreso.</p></div></div><div className="help-row"><span>02</span><div><strong>Confirma cuando ocurra</strong><p>Los movimientos pendientes no afectan el saldo.</p></div></div><div className="help-row"><span>03</span><div><strong>Revisa tu resumen</strong><p>{isVich ? 'Cambia entre quincena y mes para planificar.' : 'Consulta tu saldo y tus categorías cada mes.'}</p></div></div></section>{!DEMO && <button className="logout-button" onClick={logout}><LogOut size={18} /> Cerrar sesión o cambiar de cuenta</button>}</>}
      </div></main>
    <nav className="mobile-nav"><button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}><LayoutDashboard size={21} /><span>Resumen</span></button><button className={tab === 'movements' ? 'active' : ''} onClick={() => setTab('movements')}><CreditCard size={21} /><span>Movimientos</span></button><button className="add-tab" onClick={() => openForm()} aria-label="Agregar movimiento"><Plus size={26} /></button><button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><Menu size={21} /><span>Mi cuenta</span></button></nav>
    {showForm && <MovementForm account={account} categories={data.categories} initial={formRow} defaultType={formType} onClose={() => setShowForm(false)} onSave={handleSave} />}
    {savingError && <div className="toast" role="alert">{savingError}<button onClick={() => setSavingError('')}><X size={16} /></button></div>}
  </div>;
}

function MovementList({ rows, onEdit }) {
  if (!rows.length) return <div className="empty-small">Todavía no hay movimientos aquí.</div>;
  return <div className="movement-list">{rows.map((row) => <button className="movement-row" key={row.id} onClick={() => onEdit(row)}><IconFor row={row} /><span className="movement-main"><strong>{row.nota || CATEGORY_NAMES[row.id_categoria] || row.categoria || 'Movimiento'}</strong><small>{prettyDate(row.fecha)} · {row.tipo === 'TRASPASO' ? `${row.cuenta_origen} → ${row.cuenta_destino}` : `${row.metodo_pago}${row.cuenta && row.cuenta !== row.metodo_pago ? ` · ${row.cuenta}` : ''}`} {row.estado === 'PENDIENTE' && <em>Pendiente</em>}</small></span><span className={`movement-amount ${row.tipo === 'INGRESO' ? 'positive' : ''}`}>{row.tipo === 'TRASPASO' ? '↔ ' : row.tipo === 'INGRESO' ? '+' : '−'}{money(row.monto)}</span></button>)}</div>;
}

function HistoryPanel({ rows, onEdit, onAdd }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [account, setAccount] = useState('');
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState('');
  const months = useMemo(() => [...new Set(rows.map((row) => row.fecha.slice(0, 7)))], [rows]);
  const filtered = useMemo(() => filterMovements(rows, { query, type, account, month, status }), [rows, query, type, account, month, status]);
  const groups = useMemo(() => {
    const byMonth = new Map();
    for (const row of filtered) {
      const key = row.fecha.slice(0, 7);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key).push(row);
    }
    return [...byMonth.entries()];
  }, [filtered]);
  const hasFilters = Boolean(query || type || account || month || status);
  const clear = () => { setQuery(''); setType(''); setAccount(''); setMonth(''); setStatus(''); };
  return <><section className="history-filters"><label className="history-search"><Search size={18} /><input aria-label="Buscar movimientos" placeholder="Buscar por descripción, categoría o monto" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button aria-label="Limpiar búsqueda" onClick={() => setQuery('')}><X size={16} /></button>}</label><div className="history-types" aria-label="Tipo de movimiento">{[['', 'Todos'], ['EGRESO', 'Gastos'], ['INGRESO', 'Ingresos'], ['TRASPASO', 'Traspasos']].map(([value, label]) => <button key={label} className={type === value ? 'active' : ''} onClick={() => setType(value)}>{label}</button>)}</div><div className="history-selects"><label>Mes<select value={month} onChange={(event) => setMonth(event.target.value)}><option value="">Todos los meses</option>{months.map((key) => <option value={key} key={key}>{monthLabel(key)}</option>)}</select></label><label>Cuenta<select value={account} onChange={(event) => setAccount(event.target.value)}><option value="">Todas las cuentas</option>{[...MONEY_ACCOUNTS, UNASSIGNED_ACCOUNT].map((name) => <option value={name} key={name}>{name}</option>)}</select></label><label>Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option><option value="CONFIRMADO">Confirmados</option><option value="PENDIENTE">Pendientes</option></select></label></div></section><div className="history-toolbar"><span>{filtered.length} de {rows.length} movimientos</span>{hasFilters ? <button className="history-clear" onClick={clear}>Limpiar filtros</button> : <button className="secondary-button" onClick={onAdd}><Plus size={18} /> Agregar</button>}</div>{groups.length ? groups.map(([key, items]) => <section className="history-group" key={key}><div className="history-group-heading"><strong>{monthLabel(key)}</strong><span>{items.length} {items.length === 1 ? 'movimiento' : 'movimientos'}</span></div><div className="history-card"><MovementList rows={items} onEdit={onEdit} /></div></section>) : <div className="history-empty"><Search size={25} /><strong>{rows.length ? 'No encontramos movimientos' : 'Aún no hay movimientos'}</strong><p>{rows.length ? 'Prueba otro filtro o busca con una palabra distinta.' : 'Registra tu primer gasto o ingreso para empezar.'}</p>{hasFilters ? <button className="secondary-button" onClick={clear}>Ver todos</button> : <button className="primary-button" onClick={onAdd}><Plus size={17} /> Agregar movimiento</button>}</div>}</>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
