import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agente SQL · Ventas de ejemplo",
  description: "Preguntas en español convertidas a SQL sobre una base de ventas ficticia, con evaluación medible.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
