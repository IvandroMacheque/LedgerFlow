import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HeaderTenantBar from '../src/components/HeaderTenantBar';
import WalletOverview from '../src/components/WalletOverview';
import PaymentForm from '../src/components/PaymentForm';
import ChaosSimulator from '../src/components/ChaosSimulator';
import OutboxMonitor from '../src/components/OutboxMonitor';
import TelemetryTerminal from '../src/components/TelemetryTerminal';

const paymentProps = {
  amount: '125.00', operation: 'CREDIT', idempotencyKey: 'idem_demo_0001',
  onAmountChange: vi.fn(), onOperationChange: vi.fn(),
  onRegenerateKey: vi.fn(), onSubmit: vi.fn(), isLoading: false, error: null,
};

describe('componentes passivos — critérios do playground', () => {
  it('solicita a troca de tenant sem alterar o contexto recebido', async () => {
    const onTenantChange = vi.fn();
    render(<HeaderTenantBar tenantId="tenant-alpha" onTenantChange={onTenantChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'tenant-beta' }));
    expect(onTenantChange).toHaveBeenCalledExactlyOnceWith('tenant-beta');
    expect(screen.getByRole('button', { name: 'tenant-alpha' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('x-tenant-id')).toBeVisible();
  });

  it('delega o reset e desabilita ações durante carregamento', async () => {
    const onResetSandbox = vi.fn();
    const { rerender } = render(<HeaderTenantBar tenantId="tenant-alpha" onResetSandbox={onResetSandbox} />);
    await userEvent.click(screen.getByRole('button', { name: /Reset Sandbox State/i }));
    expect(onResetSandbox).toHaveBeenCalledOnce();
    rerender(<HeaderTenantBar tenantId="tenant-alpha" isLoading onResetSandbox={onResetSandbox} />);
    expect(screen.getByRole('button', { name: /Reset Sandbox State/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'tenant-beta' })).toBeDisabled();
  });

  it('exibe o saldo formatado e os centavos sem converter ou recalcular', () => {
    render(<WalletOverview walletId="wallet-beta-1" formattedBalance="R$ 7.654,32" balanceInCents={765432} />);
    expect(screen.getByText('R$ 7.654,32')).toBeVisible();
    expect(screen.getByText('765432')).toBeVisible();
    expect(screen.getByText('wallet-beta-1')).toBeVisible();
  });

  it('encaminha inputs controlados, regeneração e submit ao consumidor', async () => {
    render(<PaymentForm {...paymentProps} />);
    const amount = screen.getByRole('textbox', { name: /Valor/i });
    await userEvent.type(amount, '9');
    expect(paymentProps.onAmountChange).toHaveBeenLastCalledWith('125.009');
    expect(amount).toHaveValue('125.00');
    await userEvent.click(screen.getByRole('button', { name: 'DEBIT' }));
    expect(paymentProps.onOperationChange).toHaveBeenCalledWith('DEBIT');
    await userEvent.click(screen.getByRole('button', { name: /Regenerar Chave Manualmente/i }));
    expect(paymentProps.onRegenerateKey).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: /Enviar operação/i }));
    expect(paymentProps.onSubmit).toHaveBeenCalledOnce();
    expect(screen.getByText('idem_demo_0001')).toBeVisible();
  });

  it.each([
    [400, 'Valor inválido', 'red'],
    [409, 'Transação duplicada', 'amber'],
    [422, 'Saldo insuficiente', 'amber'],
  ])('apresenta o erro HTTP %s recebido por props', (status, message, tone) => {
    render(<PaymentForm {...paymentProps} error={{ status, message, fields: { amount: 'Revise o valor.' } }} />);
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('alert')).toHaveAttribute('data-tone', tone);
    expect(screen.getByRole('textbox', { name: /Valor/i })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Revise o valor.')).toBeVisible();
  });

  it('impede submit e regeneração enquanto a operação carrega', () => {
    render(<PaymentForm {...paymentProps} isLoading />);
    expect(screen.getByRole('button', { name: /Enviando/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Regenerar Chave Manualmente/i })).toBeDisabled();
  });

  it('mostra as cinco respostas de corrida e delega cada prova', async () => {
    const onBolaAttack = vi.fn();
    const onRaceTest = vi.fn();
    const onCorruptPayload = vi.fn();
    render(<ChaosSimulator onBolaAttack={onBolaAttack} onRaceTest={onRaceTest}
      onCorruptPayload={onCorruptPayload} raceStatuses={[200, 409, 409, 409, 409]}
      bolaResult={{ status: 404, message: 'NotFoundError' }} payloadResult={{ status: 400, message: 'Bad Request' }} />);
    const results = screen.getByRole('list', { name: /Resultados de concorrência/i });
    expect(within(results).getAllByRole('listitem')).toHaveLength(5);
    expect(within(results).getAllByText('409')).toHaveLength(4);
    await userEvent.click(screen.getByRole('button', { name: /Simular ataque/i }));
    await userEvent.click(screen.getByRole('button', { name: /Disparar 5 requisições/i }));
    await userEvent.click(screen.getByRole('button', { name: /Injetar payload/i }));
    expect(onBolaAttack).toHaveBeenCalledOnce();
    expect(onRaceTest).toHaveBeenCalledOnce();
    expect(onCorruptPayload).toHaveBeenCalledOnce();
    expect(screen.getByText('NotFoundError')).toBeVisible();
  });

  it('renderiza os eventos e delega polling e worker', async () => {
    const onTogglePolling = vi.fn();
    const onProcessWorker = vi.fn();
    render(<OutboxMonitor events={[
      { eventId: 'evt-test-1', type: 'PaymentCreated', status: 'PENDING', attempts: 0 },
      { eventId: 'evt-test-2', type: 'PaymentCreated', status: 'FAILED', attempts: 3 },
    ]} isPolling onTogglePolling={onTogglePolling} onProcessWorker={onProcessWorker} />);
    expect(screen.getByRole('table')).toHaveTextContent('evt-test-1');
    expect(screen.getByText('PENDING')).toHaveAttribute('data-tone', 'blue');
    expect(screen.getByText('FAILED')).toHaveAttribute('data-tone', 'red');
    await userEvent.click(screen.getByRole('button', { name: /Pausar polling/i }));
    await userEvent.click(screen.getByRole('button', { name: /Processar Worker/i }));
    expect(onTogglePolling).toHaveBeenCalledOnce();
    expect(onProcessWorker).toHaveBeenCalledOnce();
  });

  it('distingue uma tabela vazia de um carregamento', () => {
    const { rerender } = render(<OutboxMonitor events={[]} />);
    expect(screen.getByText(/Nenhum evento/i)).toBeVisible();
    rerender(<OutboxMonitor events={[]} isLoading />);
    expect(screen.getByRole('status')).toHaveTextContent(/Carregando/i);
    expect(screen.queryByText(/Nenhum evento/i)).not.toBeInTheDocument();
  });

  it('mostra métricas recebidas, correlação e JSON escapado, inclusive HTTP 500', () => {
    render(<TelemetryTerminal metrics={{ totalRequests: 19, errorRate: '15.8', averageDuration: '24' }}
      logs={[{ id: 'log-1', time: '14:32:10', method: 'POST', path: '/payments', status: 500,
        correlationId: 'corr-test-1', duration: 24, body: { message: '<script>unsafe()</script>' } }]} />);
    expect(screen.getByText('19')).toBeVisible();
    expect(screen.getByText('15.8%')).toBeVisible();
    expect(screen.getByText('24 ms')).toBeVisible();
    expect(screen.getByText('corr-test-1')).toBeVisible();
    expect(screen.getByText('500')).toHaveAttribute('data-tone', 'red');
    expect(screen.getByText(/<script>unsafe\(\)<\/script>/)).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
