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
// Applies a saved Night Drive choice before first paint, so there's no flash of Day Trip.
const themeScript = `try{if(localStorage.getItem("ttg-site-theme")==="night")document.documentElement.setAttribute("data-site-theme","night")}catch(e){}`;

export const metadata: Metadata = {
  title: "The Travel Gram · Memories that do not fade away",
  description: "Travel stories by Balu Matta: memories that do not fade away.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable} ${lora.variable} ${cormorant.variable} ${caveat.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
