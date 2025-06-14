import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AudioContextProvider } from "@/hooks/use-audio-context"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Virtual Soundspace Generator",
  description: "Create your perfect ambient atmosphere",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <AudioContextProvider>
            {children}
            <Toaster />
          </AudioContextProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

