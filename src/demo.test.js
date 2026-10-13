import test from 'node:test';
import assert from 'node:assert/strict';
import { demoAccounts } from './demo.js';
import { monthKey, periodKey, summaryFor } from './domain.js';

test('la vista quincenal usa solo importes ficticios y no cuenta pendientes', () => {
  const data = demoAccounts.vich;
  const key = periodKey(data.movements[0].fecha);
  const summary = summaryFor('vich', data.movements, key, data.profile, data.debts);
  assert.equal(summary.balance, 874);
  assert.equal(summary.pending.length, 1);
  assert.equal(data.profile.nombre, 'Alex');
});

test('la vista mensual conserva el saldo total al transferir entre cuentas', () => {
  const data = demoAccounts.tami;
  const summary = summaryFor('tami', data.movements, monthKey(data.movements[0].fecha), data.profile, data.debts);
  assert.equal(summary.balance, 1426);
  assert.equal(summary.accountBalances.Yape, 125);
  assert.equal(data.profile.nombre, 'Sam');
});
