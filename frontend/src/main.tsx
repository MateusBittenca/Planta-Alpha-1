import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { usePlantaStore } from './store/plantaStore';

function Bootstrap() {
  const bootstrap = usePlantaStore((s) => s.bootstrap);
  const stopSimulator = usePlantaStore((s) => s.stopSimulator);

  useEffect(() => {
    void bootstrap();
    return () => stopSimulator();
  }, [bootstrap, stopSimulator]);

  return <App />;
}

createRoot(document.getElementById('root')!).render(<Bootstrap />);
