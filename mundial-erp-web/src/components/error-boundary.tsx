'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RiRefreshLine, RiErrorWarningLine } from '@remixicon/react';
import * as Button from '@/components/ui/button';

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-lighter text-error-base'>
            <RiErrorWarningLine className='h-6 w-6' />
          </div>
          <h3 className='text-label-md text-text-strong-950'>
            Algo deu errado
          </h3>
          <p className='mt-1 max-w-sm text-paragraph-sm text-text-sub-600'>
            Ocorreu um erro inesperado. Tente novamente ou entre em contato com
            o suporte se o problema persistir.
          </p>
          <Button.Root
            variant='primary'
            mode='filled'
            size='medium'
            className='mt-4'
            onClick={this.handleReset}
          >
            <Button.Icon as={RiRefreshLine} />
            Tentar novamente
          </Button.Root>
        </div>
      );
    }

    return this.props.children;
  }
}
