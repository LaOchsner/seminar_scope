import React, { Component, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface Props {
    children: ReactNode;
    fallbackRoute?: string;
}

interface State {
    hasError: boolean;
}

class RedirectErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <Navigate to={this.props.fallbackRoute || '/data/pipeline/explore'} replace />;
        }

        return this.props.children;
    }
}

export default RedirectErrorBoundary;
