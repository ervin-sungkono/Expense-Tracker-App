import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  manifest: "/manifest.json", 
  title: "Xpensed",
  description: "Track and manage your spendings with Xpensed",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider enableColorScheme enableSystem>
          {children}
        </ThemeProvider>
        <GoogleAnalytics gaId="G-FG6W314EEP"/>
      </body>
    </html>
  );
}
