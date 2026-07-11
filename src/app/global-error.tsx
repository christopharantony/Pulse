'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#020617', color: '#f8fafc' }}>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '1.5rem',
            textAlign: 'center',
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}
        >
          <p style={{ fontSize: '1.75rem', fontWeight: 600 }}>Something went wrong</p>
          <p style={{ color: '#94a3b8', maxWidth: '24rem' }}>
            A critical error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              height: '2.75rem',
              padding: '0 1.25rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: '#22d3ee',
              color: '#020617',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
