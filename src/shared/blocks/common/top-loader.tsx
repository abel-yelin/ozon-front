'use client';

import NextTopLoader from 'nextjs-toploader';

export function TopLoader() {
  return (
    <NextTopLoader
      color="#6466F1"
      initialPosition={0.08}
      crawlSpeed={200}
      height={3}
      crawl={true}
      showSpinner={true}
      easing="ease"
      speed={200}
    />
  );
}
