import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

function setupFetchMock() {
  let alphaBalance = 1250000;
  let betaBalance = 420000;

  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, options = {}) => {
    const method = options.method || 'GET';
    const tenantId = options.headers?.['x-tenant-id'];

    if (url.includes('/wallets/wallet-alpha-1')) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'x-correlation-id': 'corr-ui-alpha' }),
        json: async () => ({ id: 'wallet-alpha-1', tenantId: 'tenant-alpha', balanceInCents: alphaBalance }),
      };
    }

    if (url.includes('/wallets/wallet-beta-1')) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'x-correlation-id': 'corr-ui-beta' }),
        json: async () => ({ id: 'wallet-beta-1', tenantId: 'tenant-beta', balanceInCents: betaBalance }),
      };
    }

    if (url.includes('/payments') && method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      if (tenantId === 'tenant-alpha') {
        alphaBalance += body.type === 'CREDIT' ? body.amountInCents : -body.amountInCents;
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'x-correlation-id': 'corr-ui-pay' }),
        json: async () => ({ success: true, newBalanceInCents: alphaBalance }),
      };
    }

    if (url.includes('/sandbox/reset') && method === 'POST') {
      alphaBalance = 1250000;
      betaBalance = 420000;
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'x-correlation-id': 'corr-ui-reset' }),
        json: async () => ({ success: true, message: 'Sandbox reiniciado com sucesso' }),
      };
    }

    if (url.includes('/outbox')) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'x-correlation-id': 'corr-ui-outbox' }),
        json: async () => ([
          { id: 'evt_1', eventType: 'PaymentCreated', status: 'PROCESSED', attempts: 1 },
        ]),
      };
    }

    if (url.includes('/metrics')) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'x-correlation-id': 'corr-ui-metrics' }),
        json: async () => ({ rates: { 'GET /wallets/wallet-alpha-1': 1 }, errors: {}, durations: { 'GET /wallets/wallet-alpha-1': [10] } }),
      };
    }

    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({}),
    };
  });
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
  setupFetchMock();
});

it('alterna carteiras por tenant e restaura os campos pelo reset do sandbox', async () => {
  render(<App />);
  const wallet = screen.getByRole('region', { name: 'Carteira selecionada' });
  expect(await within(wallet).findByText('wallet-alpha-1')).toBeVisible();
  expect(await within(wallet).findByText('1250000')).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'tenant-beta' }));
  expect(await within(wallet).findByText('wallet-beta-1')).toBeVisible();
  expect(await within(wallet).findByText('R$ 4.200,00')).toBeVisible();

  const amount = screen.getByRole('textbox', { name: /Valor/i });
  await userEvent.clear(amount);
  await userEvent.type(amount, '42.50');
  expect(amount).toHaveValue('42.50');

  const initialKey = screen.getByText(/^[0-9a-f-]{36}$/i).textContent;
  await userEvent.click(screen.getByRole('button', { name: /Regenerar Chave Manualmente/i }));
  const regeneratedKey = screen.getByText(/^[0-9a-f-]{36}$/i).textContent;
  expect(regeneratedKey).not.toBe(initialKey);

  await userEvent.click(screen.getByRole('button', { name: /Reset Sandbox State/i }));
  expect(amount).toHaveValue('125.00');
  expect(await within(wallet).findByText('wallet-alpha-1')).toBeVisible();
}, 15000);

it('envia pagamento real, atualiza saldo e registra histórico na telemetria', async () => {
  render(<App />);
  const wallet = screen.getByRole('region', { name: 'Carteira selecionada' });
  expect(await within(wallet).findByText('1250000')).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: /Enviar operação/i }));
  expect(await screen.findByRole('status', { name: 'Notificação da ação' })).toHaveTextContent(/HTTP 200/i);
  expect(await within(wallet).findByText('1262500')).toBeVisible();

  await userEvent.click(screen.getByRole('link', { name: 'Telemetria', exact: true }));
  await screen.findByRole('heading', { name: 'Telemetria', level: 1 });
  expect(screen.getByRole('region', { name: /Histórico de requisições/i }).querySelectorAll('article').length).toBeGreaterThanOrEqual(1);

  await userEvent.click(screen.getByRole('button', { name: /Ativar polling/i }));
  expect(screen.getByRole('button', { name: /Pausar polling/i })).toBeVisible();
  expect(screen.getByRole('status', { name: 'Notificação da ação' })).toHaveTextContent(/Polling ativado/i);
});

it('mostra apenas a tela selecionada e preserva os campos ao voltar para operações', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Operações', level: 1 })).toBeVisible();
  expect(screen.queryByRole('button', { name: /Simular ataque/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: /Histórico de requisições/i })).not.toBeInTheDocument();
  await within(screen.getByRole('region', { name: 'Carteira selecionada' })).findByText('wallet-alpha-1');
  await userEvent.clear(screen.getByRole('textbox', { name: /Valor/i }));
  await userEvent.type(screen.getByRole('textbox', { name: /Valor/i }), '87.50');

  await userEvent.click(screen.getByRole('link', { name: 'Provas de engenharia', exact: true }));
  await screen.findByRole('heading', { name: 'Provas de engenharia', level: 1 });
  expect(window.location.hash).toBe('#/provas');
  expect(screen.getByRole('link', { name: 'Provas de engenharia', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: /Simular ataque/i })).toBeVisible();
  expect(screen.queryByRole('textbox', { name: /Valor/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('link', { name: 'Telemetria', exact: true }));
  await screen.findByRole('heading', { name: 'Telemetria', level: 1 });
  expect(window.location.hash).toBe('#/telemetria');
  expect(screen.getByRole('table')).toBeVisible();
  expect(screen.getByRole('region', { name: /Histórico de requisições/i })).toBeVisible();
  expect(screen.queryByRole('button', { name: /Simular ataque/i })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('link', { name: 'Operações', exact: true }));
  await screen.findByRole('heading', { name: 'Operações', level: 1 });
  expect(screen.getByRole('textbox', { name: /Valor/i })).toHaveValue('87.50');
});

it('abre diretamente a tela de telemetria pelo endereço', async () => {
  window.history.replaceState(null, '', '/#/telemetria');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Telemetria', level: 1 })).toBeVisible();
  expect(screen.queryByRole('region', { name: 'Carteira selecionada' })).not.toBeInTheDocument();
});
