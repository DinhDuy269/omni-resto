import { AppRouter } from './router';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { BackendConnectionGate } from './shared/components/BackendConnectionGate';

function App() {
  return (
    <ErrorBoundary fallback_title="Không thể khởi tạo ứng dụng">
      <BackendConnectionGate>
        <AppRouter />
      </BackendConnectionGate>
    </ErrorBoundary>
  );
}

export default App;
