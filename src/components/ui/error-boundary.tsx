'use client'

import React from 'react'

interface ErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 py-12">
                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
                    <p className="text-gray-500 text-center mb-6 max-w-sm">
                        An unexpected error occurred. Please try reloading the page.
                    </p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null })
                            window.location.reload()
                        }}
                        className="px-6 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 active:scale-[0.98] transition-all"
                    >
                        Reload Page
                    </button>
                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <pre className="mt-6 p-4 bg-gray-100 rounded-xl text-xs text-red-600 max-w-md overflow-auto">
                            {this.state.error.message}
                        </pre>
                    )}
                </div>
            )
        }

        return this.props.children
    }
}
