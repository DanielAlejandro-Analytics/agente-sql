import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Nav } from "@/components/Nav";
import { Schema } from "@/components/Schema";
import "./globals.css";

const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Agente SQL · Ventas de ejemplo",
  description: "Preguntas en español convertidas a SQL sobre una base de ventas ficticia, con evaluación medible.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="bg-head text-white">
          <div className="flex items-center justify-between gap-4 px-4 sm:px-6">
            <div className="py-3">
              <a href="https://portafolio-dbarros.vercel.app" className="inline-block py-1 text-xs whitespace-nowrap text-white/70 hover:text-white">
                ← Portafolio
              </a>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base font-semibold sm:text-lg">
                Agente SQL · Ventas de ejemplo
                <span className="rounded border border-white/40 px-1.5 py-0.5 text-xs font-normal text-white/90">Datos ficticios</span>
              </p>
            </div>
            <Nav />
          </div>
        </header>
        <div className="flex flex-1 flex-col lg:flex-row">
          <aside aria-labelledby="esquema" className="border-line bg-surface px-4 py-4 lg:w-64 lg:shrink-0 lg:border-r lg:py-6">
            {/* En móvil el esquema parte plegado para que la pregunta quede arriba. */}
            <details className="lg:hidden">
              <summary className="cursor-pointer font-semibold">Esquema de la base</summary>
              <div className="mt-3">
                <Schema />
              </div>
            </details>
            <div className="hidden lg:block">
              <h2 id="esquema" className="mb-3 font-semibold">
                Esquema de la base
              </h2>
              <Schema />
            </div>
          </aside>
          <main className="min-w-0 flex-1 space-y-6 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
