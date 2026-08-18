'use client';

import Script from 'next/script';

// GA4 measurement id. Not a secret; it ships in the page either way.
// NEXT_PUBLIC_ values are inlined at build time, which is why the default is
// hardcoded: the static /mvdocs export has no runtime environment to read.
// Override per environment to report into a separate stream, or set
// NEXT_PUBLIC_GA_ID="" to build with analytics off.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? 'G-T9QN353SLW';

const GoogleAnalytics = () => {
  // NODE_ENV is also inlined at build time, so dev builds render nothing and
  // cannot report into the production stream.
  if (process.env.NODE_ENV !== 'production' || !GA_ID) return null;

  return (
    <>
      <Script
        // lazyOnload fires after the window load event, outside the TBT
        // measurement window.
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="lazyOnload"
      />
      <Script
        id="ga-init"
        // The stub is a few statements with negligible blocking cost, so it
        // runs afterInteractive: gtag() exists from hydration on, so events
        // fired before the library loads queue in dataLayer instead of being
        // dropped.
        strategy="afterInteractive"
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
};

export default GoogleAnalytics;
