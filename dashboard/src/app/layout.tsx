import type { Metadata } from "next";
import "./globals.css";
import '@solana/wallet-adapter-react-ui/styles.css';
import { WalletContextProvider } from "@/components/WalletContextProvider";

export const metadata: Metadata = {
  title: "SKR Claim Terminal",
  description: "Secure Share Distribution Terminal",
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
