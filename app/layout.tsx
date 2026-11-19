import type { Metadata } from "next";
import { JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = JetBrains_Mono({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Spectre — contract triage for bug-bounty auditors",
  description:
    "Paste an EVM contract address. Spectre fetches verified source and live on-chain state, runs lightweight detectors, and ranks the leads worth auditing.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
