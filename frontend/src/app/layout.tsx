import type { Metadata } from "next";
import { Inter, Playfair_Display, Lora, Cormorant_Garamond, Caveat } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", style: ["normal", "italic"] });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", style: ["normal", "italic"] });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  style: ["normal", "italic"],
  weight: ["300", "400", "500", "600", "700"],
});

const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", weight: ["500", "600"] });

export const metadata: Metadata = {
  title: "TheTravelGram",
  description: "Turn your travel memories into a blog post",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${lora.variable} ${cormorant.variable} ${caveat.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
