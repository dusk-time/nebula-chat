import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// 错误边界 - 防止白屏/黑屏
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>应用启动失败</div>
            <div style={{ 
              fontSize: '14px', 
              color: '#f87171',
              backgroundColor: 'rgba(248, 113, 113, 0.1)',
              padding: '12px',
              borderRadius: '8px',
              maxWidth: '400px',
              wordBreak: 'break-all'
            }}>
              {this.state.error}
            </div>
            <div style={{ marginTop: '20px', fontSize: '14px', color: '#94a3b8' }}>
              请尝试重启应用或联系开发者
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 确保 root 元素存在
const rootElement = document.getElementById("root");
if (!rootElement) {
  const newRoot = document.createElement("div");
  newRoot.id = "root";
  document.body.appendChild(newRoot);
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
