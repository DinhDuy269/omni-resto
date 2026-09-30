import { AppRouter } from './router';
import { ErrorBoundary } from './shared/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary fallbackTitle="Không thể khởi tạo ứng dụng">
      <AppRouter />
    </ErrorBoundary>
  );
}

export default App;
