import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";

export const metadata: Metadata = {
  title: "curl - AI-Powered API Testing Tool",
  description: "Test any API with AI. Describe any API in plain English and watch curl discover, authenticate, and test it automatically. No manual configuration needed.",
  keywords: ["API testing", "curl", "AI", "API discovery", "REST API", "developer tools", "API client", "automated testing"],
  authors: [{ name: "curl" }],
  creator: "curl",
  publisher: "curl",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://curl-ai.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'curl - AI-Powered API Testing',
    title: 'curl - Test Any API with AI',
    description: 'Describe any API in plain English and watch curl discover, authenticate, and test it automatically. The smartest way to test APIs.',
    images: [
      {
        url: '/open-graph.png',
        width: 1200,
        height: 630,
        alt: 'curl - AI-Powered API Testing Tool',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'curl - Test Any API with AI',
    description: 'Describe any API in plain English and watch curl discover, authenticate, and test it automatically.',
    images: ['/open-graph.png'],
    creator: '@curl',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/out7eau.css" />
        <link href="https://cdn.jsdelivr.net/npm/remixicon@4.3.0/fonts/remixicon.css" rel="stylesheet" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Curl - AI-Powered API Testing Tool",
              "description": "Test any API with AI. Describe any API in plain English and watch curl discover, authenticate, and test it automatically.",
              "url": process.env.NEXT_PUBLIC_BASE_URL || "https://trycurl.com",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "Any",
              "browserRequirements": "Requires JavaScript. Requires HTML5.",
              "softwareVersion": "1.0",
              "author": {
                "@type": "Organization",
                "name": "curl"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "screenshot": {
                "@type": "ImageObject",
                "url": "/open-graph.png",
                "caption": "curl AI-powered API testing interface"
              },
              "featureList": [
                "AI-powered API discovery",
                "Automatic authentication handling",
                "Natural language API requests",
                "Real-time API testing",
                "Multiple authentication methods support",
                "Smart URL parameter extraction"
              ]
            })
          }}
        />
      </head>
      <body className="antialiased" style={{ fontFamily: 'sofia-pro, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
