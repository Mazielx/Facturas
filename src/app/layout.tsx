import type { Metadata } from "next"
import { Suspense } from "react"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/lib/theme-context"
import NavMemory from "./components/nav-memory"
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from "@/lib/brand"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL("https://facturas-sigma.vercel.app"),
  title: APP_NAME,
  description: APP_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "/",
    siteName: APP_NAME,
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
  },
}

const themeScript = `
  (function() {
    var t = localStorage.getItem('theme');
    var d = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.add(d ? 'dark' : 'light');
  })();
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <Suspense fallback={null}>
            <NavMemory />
          </Suspense>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
