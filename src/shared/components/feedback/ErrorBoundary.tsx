import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ServerErrorPage } from './ServerErrorPage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches uncaught render/lifecycle errors anywhere below it and shows the 500 page instead of
 * a blank white screen. React error boundaries cannot catch errors in event handlers, async
 * code, or SSR — those are handled separately by TanStack Query's error state and toast() calls.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Uncaught render error', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <ServerErrorPage onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
