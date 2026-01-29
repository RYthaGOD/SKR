import type { Metadata, Viewport } from "next";
import "./globals.css";
import '@solana/wallet-adapter-react-ui/styles.css';
import { WalletContextProvider } from "@/components/WalletContextProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
}

export const metadata: Metadata = {
  title: "SKR Claim Terminal",
  description: "Secure Share Distribution Terminal",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-black text-[#00ff41] scanline">
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}
