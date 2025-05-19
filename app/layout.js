import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  manifest: "/manifest.json", 
  title: "Expense Tracker App",
  description: "Track and manage your expense with ET",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider enableColorScheme enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
