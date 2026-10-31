import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Box, Code2, FlaskConical, ShieldCheck } from 'lucide-react';
import HeaderTenantBar from './components/HeaderTenantBar';
import OperationsPage from './pages/OperationsPage';
import EngineeringPage from './pages/EngineeringPage';
import TelemetryPage from './pages/TelemetryPage';
import { Toast } from './components/ui/Feedback';
import { usePaymentFlow, submitPayment, regeneratePaymentKey, resetSandboxState } from './hooks/usePaymentFlow';
import { useChaosActions, simulateBolaAttack, simulateIdempotencyRace, injectCorruptPayload } from './hooks/useChaosActions';
import { useTelemetryPolling, toggleTelemetryPolling, processOutboxWorker } from './hooks/useTelemetryPolling';

const screens = {
  operations: { hash: '#/operacoes', title: 'Operações', description: 'Inspecione sua carteira e explore o contrato de pagamentos.' },
  engineering: { hash: '#/provas', title: 'Provas de engenharia', description: 'Explore isolamento de tenant, idempotência e validação de payloads.' },
  telemetry: { hash: '#/telemetria', title: 'Telemetria', description: 'Acompanhe o outbox, as métricas RED e as respostas de cada requisição.' },
};

function screenFromLocation() {
  return Object.keys(screens).find((key) => screens[key].hash === window.location.hash) ?? 'operations';
}

export default function App() {
  // Estado exclusivamente de apresentação. Regras e integrações ficam nos stubs.
  const [activeScreen, setActiveScreen] = useState(screenFromLocation);
  const mainRef = useRef(null);
  const [tenantId, setTenantId] = useState('tenant-alpha');
  const [amount, setAmount] = useState('125.00');
  const [operation, setOperation] = useState('CREDIT');
  const [manualKey, setManualKey] = useState(null);
  const [pollingPreview, setPollingPreview] = useState(false);
  const [notice, setNotice] = useState(null);
  const payment = usePaymentFlow({ tenantId });
  const chaos = useChaosActions();
  const telemetry = useTelemetryPolling({ tenantId });
  const idempotencyKey = manualKey ?? payment.idempotencyKey;
  const currentScreen = screens[activeScreen];

  useEffect(() => {
    const onHashChange = () => setActiveScreen(screenFromLocation());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [activeScreen]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function resetPreview() {
    setTenantId('tenant-alpha');
    setAmount('125.00');
    setOperation('CREDIT');
    setManualKey(null);
    setPollingPreview(false);
    setNotice({ message: resetSandboxState().message });
  }

  return <div className="min-h-screen bg-slate-950 text-slate-200">
    <a href="#main" className="skip-link" onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>Pular para o conteúdo</a>
    <HeaderTenantBar tenantId={tenantId} onTenantChange={setTenantId} onResetSandbox={resetPreview} activeScreen={activeScreen} isLoading={payment.isLoading} error={null} />
    <main id="main" ref={mainRef} tabIndex={-1} className="page-shell pb-10 pt-8 focus:outline-none">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-5">
        <div><div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-400"><Box aria-hidden="true" className="size-3.5" /><span>Sandbox</span><span className="text-slate-600">/</span><span className="text-slate-300">{currentScreen.title}</span></div>
          <h1 className="text-[clamp(1.4rem,2.5vw,2rem)] font-semibold tracking-tight text-slate-100">{currentScreen.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">{currentScreen.description}</p>
        </div>
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-indigo-400/20 bg-indigo-400/5 px-3 py-2"><FlaskConical aria-hidden="true" className="size-3.5 text-indigo-300" /><span className="text-xs text-indigo-200">Modo demonstrativo</span><span className="rounded bg-indigo-400/10 px-1.5 py-0.5 font-mono text-[0.6rem] text-indigo-300">v0.1</span></div>
      </div>
      {activeScreen === 'engineering' && <div aria-label="Fluxo de referência da arquitetura" className="mb-6 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3 text-[0.65rem]">
        <span className="flex items-center gap-2 text-slate-400"><Code2 aria-hidden="true" className="size-3.5" />Fluxo de referência</span>
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-slate-300"><span>request</span><ArrowRight aria-hidden="true" className="size-3 text-slate-600" /><span className="flex items-center gap-1 text-indigo-300"><ShieldCheck aria-hidden="true" className="size-3" />tenant boundary</span><ArrowRight aria-hidden="true" className="size-3 text-slate-600" /><span>Zod gate</span><ArrowRight aria-hidden="true" className="size-3 text-slate-600" /><span>ledger</span><ArrowRight aria-hidden="true" className="size-3 text-slate-600" /><span className="text-blue-300">outbox</span></div>
      </div>}
      {activeScreen === 'operations' && <OperationsPage
        walletProps={{ ...payment.wallet, isLoading: payment.isLoading, error: payment.error }}
        paymentProps={{ amount, operation, idempotencyKey, onAmountChange: setAmount, onOperationChange: setOperation,
          onRegenerateKey: () => { setManualKey(regeneratePaymentKey()); setNotice({ message: 'Mock: segunda chave de exemplo selecionada. O stub não gera chaves únicas.' }); },
          onSubmit: () => setNotice({ message: submitPayment({ tenantId, walletId: payment.wallet.walletId, amount, operation, idempotencyKey }).message }),
          isLoading: payment.isLoading, error: payment.error }} />}
      {activeScreen === 'engineering' && <EngineeringPage chaosProps={{ ...chaos,
        onBolaAttack: () => setNotice({ message: simulateBolaAttack().message }),
        onRaceTest: () => setNotice({ message: simulateIdempotencyRace().message }),
        onCorruptPayload: () => setNotice({ message: injectCorruptPayload().message }) }} />}
      {activeScreen === 'telemetry' && <TelemetryPage
        outboxProps={{ events: telemetry.events, isPolling: pollingPreview, isLoading: telemetry.isLoading, isProcessing: telemetry.isProcessing, error: telemetry.error,
          onTogglePolling: () => { setPollingPreview(!pollingPreview); setNotice({ message: toggleTelemetryPolling(!pollingPreview).message }); },
          onProcessWorker: () => setNotice({ message: processOutboxWorker({ tenantId }).message }) }}
        terminalProps={{ metrics: telemetry.metrics, logs: telemetry.logs, isLoading: telemetry.isLoading, error: telemetry.error }} />}
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-5 text-[0.65rem] text-slate-400"><span>LedgerFlow <span className="mx-1 text-slate-600">/</span> Engineering & Chaos Playground</span><span className="font-mono">fixtures locais · sem conexão com API</span></footer>
    </main>
    <Toast message={notice?.message} onDismiss={() => setNotice(null)} />
  </div>;
}
