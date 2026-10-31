import ChaosSimulator from '../components/ChaosSimulator';

export default function EngineeringPage({ chaosProps }) {
  return <div className="mx-auto w-full max-w-5xl"><ChaosSimulator {...chaosProps} /></div>;
}
