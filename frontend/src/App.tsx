import { AppRouter } from './router';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

function App() {
  return (
    // <BackendConnectionGate>
      <AppRouter />
    // </BackendConnectionGate>
  );
}

export default App;
