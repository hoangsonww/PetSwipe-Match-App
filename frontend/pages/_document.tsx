import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Primary Meta Tags */}
        <meta charSet="utf-8" />
        <meta
          name="description"
          content="CollectiveGood: Advancing primary-care diagnostics with AI and collective expert feedback."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="CollectiveGood – AI-Powered Primary Care Study"
        />
        <meta
          property="og:description"
          content="Refining large language models for primary-care diagnostics through collective intelligence and expert feedback."
        />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content="CollectiveGood – AI-Powered Primary Care Study"
        />
        <meta
          name="twitter:description"
          content="Refining large language models for primary-care diagnostics through collective intelligence and expert feedback."
        />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" href="/favicon.png" sizes="180x180" />

        {/* Theme Color */}
        <meta name="theme-color" content="#7097A8" />
      </Head>
      <body className="antialiased bg-white text-gray-800">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
