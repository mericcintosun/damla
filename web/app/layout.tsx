import type { Metadata } from "next";
import "./globals.css";
import { AmbientBackground } from "@/components/Brand";

const ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 28"><path d="M12 1C12 1 3 12 3 18a9 9 0 0 0 18 0C21 12 12 1 12 1Z" fill="#34e2c8"/></svg>'
  );

const SITE = "https://getdamla.vercel.app";
const TITLE = "Damla · send money by link";
const DESCRIPTION =
  "Send MON by a link on Monad. The recipient taps it and the money is theirs, with no wallet, no gas, and no app. A relayer pays the gas but can never redirect a single wei.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s" },
  description: DESCRIPTION,
  applicationName: "Damla",
  keywords: [
    "Damla",
    "Monad",
    "send money by link",
    "walletless",
    "gasless",
    "crypto payment link",
    "onchain",
    "MON",
  ],
  authors: [{ name: "Damla" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Damla",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/brand/og-cover.jpg", width: 1200, height: 630, alt: "Damla, send money by a link" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/brand/og-cover.jpg"],
  },
  robots: { index: true, follow: true },
  icons: { icon: [{ url: ICON, type: "image/svg+xml" }] },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AmbientBackground />
        {children}
      </body>
    </html>
  );
}
