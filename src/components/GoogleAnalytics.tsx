'use client';

import Script from 'next/script';

// GA4 measurement id. Not a secret; it ships in the page either way. Override
// per environment so preview deploys don't report into the production stream.
// NEXT_PUBLIC_ values are inlined at build time, which is why the default is
// hardcoded: the static /mvdocs export has no runtime environment to read.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? 'G-T9QN353SLW';

const GoogleAnalytics = () => {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        // lazyOnload fires after the window load event, outside the TBT
        // measurement window.
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="lazyOnload"
      />
      <Script id="ga-init" strategy="lazyOnload">
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
