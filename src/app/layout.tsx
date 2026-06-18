import type { Metadata, Viewport } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Meu Legado Vivo",
  description:
    "Uma conversa profunda sobre quem você é, o que te move e o legado que você está construindo.",
};

export const viewport: Viewport = {
  themeColor: "#1C1728",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${lora.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
