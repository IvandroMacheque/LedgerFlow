import WalletOverview from '../components/WalletOverview';
import PaymentForm from '../components/PaymentForm';

export default function OperationsPage({ walletProps, paymentProps }) {
  return <div className="dashboard-grid">
    <WalletOverview {...walletProps} />
    <PaymentForm {...paymentProps} />
  </div>;
}
