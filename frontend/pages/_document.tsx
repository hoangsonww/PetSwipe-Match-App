import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  const siteUrl = "https://petswipe.vercel.app";
  const title = "PetSwipe – Find Adoptable Pets Near You";
  const description =
    "PetSwipe: Swipe through nearby adoptable pets and connect with local shelters in real time. Discover your new best friend today!";
  const keywords =
    "Pet adoption, adoptable pets, pets near me, animal shelters, rescue pets, adopt dogs, adopt cats, pet finder";
  const themeColor = "#7097A8";

  return (
    <Html lang="en">
      <Head>
        {/* Basic Meta Tags */}
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={description} />
        <meta name="keywords" content={keywords} />
        <meta name="author" content="PetSwipe Team" />
        <link rel="canonical" href={siteUrl} />
        <meta name="robots" content="index, follow" />

        {/* Performance Hints */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="PetSwipe" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta
          property="og:image"
          content={`${siteUrl}/android-chrome-512x512.png`}
        />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@PetSwipeApp" />
        <meta name="twitter:creator" content="@PetSwipeApp" />
        <meta name="twitter:url" content={siteUrl} />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta
          name="twitter:image"
          content={`${siteUrl}/android-chrome-512x512.png`}
        />

        {/* Icons & PWA */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={themeColor} />
        <meta name="msapplication-TileColor" content={themeColor} />
        <meta name="msapplication-TileImage" content="/mstile-150x150.png" />

        {/* Structured Data (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "PetSwipe",
              url: siteUrl,
              potentialAction: {
                "@type": "SearchAction",
                target: `${siteUrl}/?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </Head>
      <body className="antialiased bg-white text-gray-800">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
