import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SERENVI - Premium Fashion & Lifestyle",
  description: "SERENVI MLM Platform - Premium fashion and lifestyle products",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // CLERK_SECRET_KEY is server-only so this is evaluated at request time.
  // Until Clerk keys are configured the app renders without auth instead of
  // crashing every route (see proxy.ts). TODO(clerk): remove fallback.
  if (!process.env.CLERK_SECRET_KEY) {
    return (
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider
          appearance={{
            theme: dark,
            variables: {
              colorPrimary: "#06b6d4",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
