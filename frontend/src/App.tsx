import { AppRouter } from './router';
import { BackendConnectionGate } from './shared/components/BackendConnectionGate';

function App() {
  return (
    <BackendConnectionGate>
      <AppRouter />
    </BackendConnectionGate>
  );
}

export default App;
