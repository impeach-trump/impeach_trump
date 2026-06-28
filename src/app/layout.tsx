import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Track efforts to impeach Trump",
  description:
    "See which House members helped impeachment move forward, who blocked it, and where your representatives stood.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <footer className="siteFooter">
          <p>
            Data may be inaccurate or incomplete. Not affiliated with any
            government agency, elected official, campaign, party, or political
            committee. Vote data is based on official House Clerk roll-call
            records linked on this site. Please verify all records against the
            official source.
          </p>
        </footer>
      </body>
    </html>
  );
}
