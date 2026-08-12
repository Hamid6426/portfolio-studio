import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { headers } from "next/headers";
import { getStartupState } from "@/config/startup";
import { redirect } from "next/navigation";
import { QueryProvider } from "@/components/providers/query-provider";
import { getAppUrl } from "@/lib/app-url";
import { bindRequestContext } from "@/lib/request-context";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const syne = Syne({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL(`${getAppUrl()}/`),
  title: "Portfolio Studio",
  description:
    "Design, manage, and publish your portfolio from one place — themes, blocks, and a live site.",
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
  // Bind request id early so repository logError lines can correlate.
  await bindRequestContext();
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
      className={cn("antialiased", inter.variable, syne.variable)}
    >
      <body className="flex min-h-screen flex-col">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
