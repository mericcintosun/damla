import type { Metadata } from "next";
import "./globals.css";

const ICON =
  "data:image/svg+xml, " +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 28"><path d="M12 1C12 1 3 12 3 18a9 9 0 0 0 18 0C21 12 12 1 12 1Z" fill="#34e2c8"/></svg>'
  );

export const metadata: Metadata = {
  title: "Damla · send money by link",
  description:
    "Send MON by link. The recipient taps it and the money is theirs, no wallet, no gas, no app. A relayer pays the gas but can never redirect a single wei.",
  icons: { icon: [{ url: ICON, type: "image/svg+xml" }] },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
