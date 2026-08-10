import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { headers } from "next/headers";
import { getStartupState } from "@/config/startup";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Portfolio Builder",
  description: "Build your portfolio with ease",
};

const PUBLIC_ROUTES = ["/setup", "/error/database"];

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The pathname is injected by proxy.ts. These routes are the redirect
  // targets of the startup gate, so they must render even when setup is
  // incomplete — otherwise the gate redirects them to themselves in a loop.
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/";

  if (!PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    const startup = await getStartupState();

    switch (startup.state) {
      case "needs-setup":
        redirect("/setup");
      case "database-connection-failed":
        redirect("/error/database");
      case "needs-migration":
        redirect("/setup");
    }
  }

  return (
    <html
      lang="en"
      className={cn("antialiased", inter.variable)}
    >
      <body className="min-h-screen flex flex-col">
        {children}
        <Toaster richColors closeButton position="top-center" />
      </body>
    </html>
  );
}

