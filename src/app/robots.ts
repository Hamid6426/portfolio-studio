import type { MetadataRoute } from "next";

import { getAppUrl } from "@/lib/app-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard/", "/login", "/setup", "/setup-guide"],
    },
    sitemap: `${getAppUrl()}/sitemap.xml`,
  };
}
