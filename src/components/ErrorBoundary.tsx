"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset() {
    this.setState({ hasError: false, error: undefined });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="text-red-500" size={24} />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">
            Xatolik yuz berdi
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md">
            {this.state.error?.message ?? "Sahifani yuklashda muammo bo'ldi. Qayta urinib ko'ring."}
          </p>
          <button
            onClick={() => this.handleReset()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-colors"
          >
            <RefreshCw size={14} />
            Qayta urinish
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
