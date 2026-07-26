import { AppRouter } from './router';
import { BackendConnectionGate } from './components/common/BackendConnectionGate';

function App() {
  return (
    <BackendConnectionGate>
      <AppRouter />
    </BackendConnectionGate>
  );
}

export default App;
