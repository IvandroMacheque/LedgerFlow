import { beforeEach, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

beforeEach(() => window.history.replaceState(null, '', '/'));

it('alterna fixtures por tenant e restaura os campos pelo reset visual', async () => {
  render(<App />);
  const wallet = screen.getByRole('region', { name: 'Carteira selecionada' });
  expect(within(wallet).getByText('wallet-alpha-1')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'tenant-beta' }));
  expect(within(wallet).getByText('wallet-beta-1')).toBeVisible();
  expect(within(wallet).getByText('R$ 4.200,00')).toBeVisible();
  const amount = screen.getByRole('textbox', { name: /Valor/i });
  await userEvent.clear(amount);
  await userEvent.type(amount, '42.50');
  expect(amount).toHaveValue('42.50');
  await userEvent.click(screen.getByRole('button', { name: /Regenerar Chave Manualmente/i }));
  expect(screen.getByText('idem_sandbox_manual_0002')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: /Reset Sandbox State/i }));
  expect(amount).toHaveValue('125.00');
  expect(screen.getByText('idem_sandbox_alpha_0001')).toBeVisible();
  expect(within(wallet).getByText('wallet-alpha-1')).toBeVisible();
});

it('identifica as ações como mock sem movimentar saldo ou produzir logs falsos', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: /Enviar operação/i }));
  expect(screen.getByRole('status', { name: 'Notificação da ação' })).toHaveTextContent(/não envia pagamentos/i);
  const wallet = screen.getByRole('region', { name: 'Carteira selecionada' });
  expect(within(wallet).getByText('1250000')).toBeVisible();
  await userEvent.click(screen.getByRole('link', { name: 'Telemetria', exact: true }));
  await screen.findByRole('heading', { name: 'Telemetria', level: 1 });
  expect(screen.getByRole('region', { name: /Histórico de requisições/i }).querySelectorAll('article')).toHaveLength(6);
  await userEvent.click(screen.getByRole('button', { name: /Ativar polling/i }));
  expect(screen.getByRole('button', { name: /Pausar polling/i })).toBeVisible();
  expect(screen.getByRole('status', { name: 'Notificação da ação' })).toHaveTextContent(/Nenhuma consulta periódica/i);
});

it('mostra apenas a tela selecionada e preserva os campos ao voltar para operações', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Operações', level: 1 })).toBeVisible();
  expect(screen.queryByRole('button', { name: /Simular ataque/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: /Histórico de requisições/i })).not.toBeInTheDocument();
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

it('abre diretamente a tela de telemetria pelo endereço', () => {
  window.history.replaceState(null, '', '/#/telemetria');
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Telemetria', level: 1 })).toBeVisible();
  expect(screen.queryByRole('region', { name: 'Carteira selecionada' })).not.toBeInTheDocument();
});
