import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  private readonly maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log to external service if needed
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: any) => {
    // Here you could send error to logging service
    console.error('Application Error:', {
      error: error.message,
      stack: error.stack,
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private getErrorMessage = (error: Error): string => {
    if (error.message?.includes('connection') || error.message?.includes('network')) {
      return 'Connection Error: Unable to connect to the database. Please check your internet connection.';
    }
    
    if (error.message?.includes('JWT') || error.message?.includes('auth')) {
      return 'Authentication Error: Please sign in again.';
    }
    
    if (error.message?.includes('not found')) {
      return 'Resource Not Found: The requested item could not be found.';
    }
    
    return 'Application Error: Something went wrong. Please try again.';
  };

  private getErrorSolution = (error: Error): string => {
    if (error.message?.includes('connection') || error.message?.includes('network')) {
      return 'Check your internet connection and try refreshing the page.';
    }
    
    if (error.message?.includes('JWT') || error.message?.includes('auth')) {
      return 'Your session has expired. Please sign out and sign in again.';
    }
    
    if (error.message?.includes('not found')) {
      return 'The item you\'re looking for may have been deleted or moved.';
    }
    
    return 'This is likely a temporary issue. Please try again in a moment.';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const error = this.state.error!;
      const errorMessage = this.getErrorMessage(error);
      const errorSolution = this.getErrorSolution(error);
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-red-500" />
                <div>
                  <CardTitle className="text-red-900">
                    {canRetry ? 'Something went wrong' : 'Application Error'}
                  </CardTitle>
                  <p className="text-sm text-neutral-600 mt-1">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 text-sm">
                  <strong>What you can do:</strong> {errorSolution}
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="bg-neutral-100 border rounded-lg p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    Technical Details (Development)
                  </summary>
                  <div className="mt-2 text-xs text-neutral-600 whitespace-pre-wrap">
                    <p><strong>Error:</strong> {error.message}</p>
                    <p><strong>Stack:</strong></p>
                    <pre className="text-xs bg-neutral-200 p-2 rounded mt-1 overflow-auto">
                      {error.stack}
                    </pre>
                  </div>
                </details>
              )}

              <div className="flex gap-2 pt-2">
                {canRetry ? (
                  <Button 
                    onClick={this.handleRetry}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again {this.state.retryCount > 0 && `(${this.state.retryCount}/${this.maxRetries})`}
                  </Button>
                ) : (
                  <Button 
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 