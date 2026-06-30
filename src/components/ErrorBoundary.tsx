import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Catches any runtime error so the whole screen never goes white. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('GLOAMING crashed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-5 bg-void p-6 text-center">
          <h1 className="font-display text-3xl text-dread-bright text-glow-dread">The dark swallowed something.</h1>
          <p className="max-w-md font-body text-sm italic text-parchment/80">
            An unexpected error broke the spell. Reload to walk the dusk again.
          </p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="rounded-lg border border-ember/60 bg-ember/15 px-6 py-2.5 font-display text-sm uppercase tracking-[0.2em] text-ember-bright hover:bg-ember/25"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
