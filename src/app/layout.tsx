import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/app/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "DentalKeep", template: "%s · DentalKeep" },
  description: "Private dental records for solo dentists.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-PH" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
