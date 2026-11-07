import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  // Text renders in the fallback immediately and swaps when the file lands.
  // Without this, a slow font is a blank headline, which is the worst thing a
  // landing page can show.
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  // Only used for code and identifiers, never for a heading, so it must not
  // compete with the text face for early bandwidth.
  preload: false,
});

export const metadata: Metadata = {
  // metadataBase makes every relative URL below absolute; without it Next warns
  // and social cards resolve against localhost.
  metadataBase: new URL("https://codegraph-navy.vercel.app"),
  title: "Cartograph",
  description: "Dependency maps of public GitHub repositories",
  // Relative, so metadataBase resolves it. opengraph-image.tsx fills this in
  // automatically, but naming it here keeps the card from silently vanishing
  // if that file is ever renamed.
  alternates: { canonical: "/" },
  openGraph: {
    siteName: "Cartograph",
    type: "website",
    url: "/",
    title: "Cartograph — see what your code depends on",
    description: "Every edge resolved by the parser, every explanation cited to a file it actually read.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Cartograph" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cartograph — see what your code depends on",
    description: "Every edge resolved by the parser, every explanation cited to a file it actually read.",
  },
  robots: { index: true, follow: true },
};

// Clerk's components read the same tokens as the app, so they follow the
// theme control instead of the OS.
const clerkAppearance = {
  variables: {
    colorBackground: "var(--surface)",
    colorForeground: "var(--fg)",
    colorMutedForeground: "var(--fg-muted)",
    colorPrimary: "var(--accent)",
    colorPrimaryForeground: "var(--accent-fg)",
    colorInput: "var(--canvas)",
    colorInputForeground: "var(--fg)",
    colorNeutral: "var(--fg)",
    colorBorder: "var(--line)",
    fontFamily: "var(--font-geist-sans)",
    fontSize: "0.8125rem",
    borderRadius: "0.25rem",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex h-full flex-col">
        {/* In code, not env: the Vercel project still has the fallback set to
            "/", which lands a signed-in person on the marketing page. Props win
            over the env vars. */}
        <ClerkProvider
          appearance={clerkAppearance}
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/dashboard"
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
