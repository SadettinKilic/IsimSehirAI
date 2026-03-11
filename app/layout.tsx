import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "İsimŞehirAI — Zeki Kelime Oyunu",
  description:
    "Yapay Zeka destekli, çok oyunculu modern İsim-Şehir oyunu. Arkadaşlarınla oda kur, yarış ve kazanma şansını AI hakemiyle yakala.",
  keywords: ["isim şehir", "kelime oyunu", "çok oyunculu", "AI", "yapay zeka"],
  authors: [{ name: "İsimŞehirAI" }],
  openGraph: {
    title: "İsimŞehirAI",
    description: "Yapay Zeka destekli çok oyunculu kelime oyunu",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f0a1e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} ${outfit.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
