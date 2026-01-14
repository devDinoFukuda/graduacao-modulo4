// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

const isConfigured = outputs && Object.keys(outputs).length > 0 && JSON.stringify(outputs).length > 30; // 22 bytes is just version:1

if (isConfigured) {
    Amplify.configure(outputs);
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "2rem", fontFamily: "sans-serif", color: "#d32f2f" }}>
                    <h1>Algo deu errado na aplicação.</h1>
                    <p>Erro técnico:</p>
                    <pre style={{ background: "#f8d7da", padding: "1rem", borderRadius: "4px", overflow: "auto" }}>
                        {this.state.error?.toString()}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {!isConfigured ? (
            <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
                <h1 style={{ color: "#ef6c00" }}>Configuração Pendente</h1>
                <p>O arquivo <code>amplify_outputs.json</code> parece estar vazio ou incompleto.</p>
                <p>Isso significa que o Backend na AWS ainda não foi implantado.</p>
                <hr />
                <h3>Como resolver:</h3>
                <ol>
                    <li>Abra seu terminal na pasta do projeto.</li>
                    <li>Execute o comando: <code>npx ampx sandbox</code></li>
                    <li>Aguarde o deploy finalizar (pode levar alguns minutos).</li>
                    <li>Recarregue esta página.</li>
                </ol>
            </div>
        ) : (
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        )}
    </React.StrictMode>,
)
