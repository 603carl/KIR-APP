import { AlertTriangle } from "lucide-react";
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 text-gray-900">
                    <div className="max-w-md rounded-lg bg-white p-6 shadow-xl border border-red-100">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <AlertTriangle className="h-8 w-8" />
                            <h1 className="text-xl font-bold">Application Crashed</h1>
                        </div>
                        <p className="mb-4 text-gray-600">
                            Something went wrong while loading the application.
                        </p>
                        <div className="mb-4 overflow-auto rounded bg-gray-900 p-4 text-xs text-red-300 font-mono max-h-64">
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo?.componentStack}
                        </div>
                        <button
                            className="rounded bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
                            onClick={() => window.location.reload()}
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
