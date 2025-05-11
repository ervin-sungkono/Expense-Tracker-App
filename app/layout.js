import { Inter } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: "Expense Tracker App",
  description: "Track and manage your expense with ET",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Suspense>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
