import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fuentes locales: la demo funciona sin internet. Inter (variable 100–900) y JetBrains Mono 500, subconjunto latino, OFL.
const inter = localFont({ src: "./fonts/inter-latin.woff2", weight: "100 900", variable: "--font-inter", adjustFontFallback: false });
const mono = localFont({ src: "./fonts/jetbrains-mono-500-latin.woff2", weight: "500", variable: "--font-jbmono", adjustFontFallback: false });

export const metadata: Metadata = {
  title: "Sal de Origen",
  description: "Trazabilidad productiva para la sal de Jujuy.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es" className={`${inter.variable} ${mono.variable}`}><body>{children}</body></html>;
}
