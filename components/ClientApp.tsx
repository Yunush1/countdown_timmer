'use client';

import dynamic from 'next/dynamic';

// The app depends on the viewer's clock, time zone and saved data,
// so it renders in the browser only (no server render to mismatch).
const CountdownApp = dynamic(() => import('./CountdownApp'), {
  ssr: false,
  loading: () => <p className="loading">Loading your countdown…</p>,
});

export default function ClientApp() {
  return <CountdownApp />;
}
