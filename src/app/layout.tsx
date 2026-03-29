import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NoShow Shield — Ovianta",
  description: "Módulo de predicción de no-shows para clínicas y hospitales",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: extensiones de navegador (Grammarly, etc.)
          inyectan atributos en <body> causando mismatch de hidratación. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* TooltipProvider requerido por shadcn/ui para tooltips globales */}
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
