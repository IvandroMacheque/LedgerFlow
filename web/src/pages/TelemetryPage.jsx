import OutboxMonitor from '../components/OutboxMonitor';
import TelemetryTerminal from '../components/TelemetryTerminal';

export default function TelemetryPage({ outboxProps, terminalProps }) {
  return <div className="dashboard-grid">
    <OutboxMonitor {...outboxProps} />
    <TelemetryTerminal {...terminalProps} />
  </div>;
}
