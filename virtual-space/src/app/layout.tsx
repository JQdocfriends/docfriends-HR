import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "숲 — 임금님 귀는 당나귀 귀",
  description: "숲에서 자유롭게 이야기하세요. 픽셀 아트 가상 공간 채팅 서비스.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-[#1a2a15]">{children}</body>
    </html>
  );
}
