import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('BHW App Error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-red-100 shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-6">
              An unexpected error occurred. Your data is safe — please reload the page.
            </p>
            {import.meta.env.DEV && (
              <pre className="text-left text-xs bg-slate-100 rounded-xl p-4 text-red-600 overflow-auto mb-6 max-h-40">
                {this.state.error?.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all"
            >
              🔄 Reload App
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
