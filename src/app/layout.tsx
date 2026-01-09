import type { Metadata } from "next";
import Script from "next/script";
import { JetBrains_Mono, Space_Grotesk, Source_Sans_3 } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const displayFont = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const bodyFont = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const GA_MEASUREMENT_ID = "G-NQ2YE7VPYJ";

export const metadata: Metadata = {
  title: {
    default: "DotaData | Teams, Leagues, and Match Intelligence",
    template: "%s | DotaData",
  },
  description:
    "DotaData is a competitive Dota 2 analytics hub highlighting league trends, team performance, and patch shifts.",
  metadataBase: new URL("https://dotadata.com"),
  openGraph: {
    title: "DotaData | Teams, Leagues, and Match Intelligence",
    description:
      "Track Dota 2 leagues, teams, and patch changes with clear stats and curated insights.",
    type: "website",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} min-h-screen antialiased`}
      >
        <Script id="site-ld-json" type="application/ld+json" strategy="afterInteractive">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "DotaData",
            url: "https://dotadata.com",
            description:
              "DotaData is a competitive Dota 2 analytics hub highlighting league trends, team performance, and patch shifts.",
            publisher: {
              "@type": "Organization",
              name: "DotaData",
              url: "https://dotadata.com",
            },
          })}
        </Script>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="relative min-h-screen bg-[radial-gradient(circle_at_top,_rgba(24,185,157,0.12),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(235,189,80,0.18),_transparent_45%)] dark:bg-[radial-gradient(circle_at_top,_rgba(80,220,200,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(220,180,90,0.12),_transparent_45%)]">
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),transparent_30%)] dark:bg-[linear-gradient(180deg,rgba(0,0,0,0.3),transparent_35%)]" />
            <SiteHeader />
            <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-12 md:px-6">
              {children}
            </main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
