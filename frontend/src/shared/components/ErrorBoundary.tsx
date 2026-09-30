import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: '48px 24px',
            maxWidth: '600px',
            margin: '40px auto',
            textAlign: 'center',
            background: 'var(--c-surface, #ffffff)',
            borderRadius: '16px',
            border: '1px solid var(--c-border, #e2e8f0)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            fontFamily: 'var(--c-font, system-ui, sans-serif)',
          }}
        >
          <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--c-text-main, #1e293b)', margin: '0 0 8px' }}>
            {this.props.fallbackTitle || 'Đã xảy ra lỗi hiển thị'}
          </h2>
          <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '24px' }}>
            {this.state.error?.message || 'Giao diện gặp sự cố tạm thời. Vui lòng tải lại hoặc quay lại trang chủ.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--c-primary, #e85d26)',
                color: '#ffffff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔄 Tải lại trang
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/client';
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid var(--c-border, #cbd5e1)',
                background: 'transparent',
                color: 'var(--c-text-main, #1e293b)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Về trang chủ
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
