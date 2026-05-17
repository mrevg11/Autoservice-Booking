import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: Error): State {
    const isChunkError =
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.name === 'ChunkLoadError';
    return { hasError: true, isChunkError };
  }

  componentDidCatch(error: Error) {
    const isChunkError =
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.name === 'ChunkLoadError';

    if (isChunkError) {
      const reloadKey = 'chunk_reload_attempted';
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError && this.state.isChunkError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-gray-600">Оновлення сайту. Перезавантаження...</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-500 text-white rounded"
          >
            Оновити сторінку
          </button>
        </div>
      );
    }

    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <p className="text-gray-600">Щось пішло не так</p>
          <button
            onClick={() => this.setState({ hasError: false, isChunkError: false })}
            className="px-4 py-2 bg-orange-500 text-white rounded"
          >
            Спробувати знову
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
