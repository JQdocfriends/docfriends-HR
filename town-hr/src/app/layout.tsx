import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";

import "./globals.css";

const pretendard = localFont({
  src: [
    {
      path: "../../public/fonts/PretendardVariable.woff2",
      style: "normal",
    },
  ],
  variable: "--font-pretendard",
  display: "swap",
  fallback: [
    "Pretendard",
    "-apple-system",
    "BlinkMacSystemFont",
    "system-ui",
    "Helvetica Neue",
    "Segoe UI",
    "Apple SD Gothic Neo",
    "Noto Sans KR",
    "Malgun Gothic",
    "sans-serif",
  ],
});

export const metadata: Metadata = {
  title: "타운 (Town) - HR 관리",
  description: "IT 스타트업을 위한 사내 HR 관리 도구",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${pretendard.variable} font-sans antialiased`}>
        <AuthProvider>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
