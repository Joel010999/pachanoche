import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sal de Origen",
  description: "Trazabilidad productiva para la sal de Jujuy.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
