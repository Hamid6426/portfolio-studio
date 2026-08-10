import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-black text-white">
      <Image
        src="/bg-2.avif"
        alt=""
        fill
        priority
        className="animate-[home-zoom_18s_ease-out_forwards] object-cover opacity-50"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-black via-black/75 to-black/35"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_20%,rgba(0,0,0,0.55)_100%)]"
      />

      <main className="relative z-10 flex flex-1 flex-col justify-end px-6 pt-24 pb-16 sm:px-10 sm:pb-20 lg:px-16 lg:pb-24">
        <div className="flex max-w-3xl flex-col gap-8">
          <div className="flex flex-col gap-5">
            <p className="animate-[home-rise_0.8s_ease-out_both] font-(family-name:--font-display) text-5xl leading-[0.95] font-semibold tracking-tight text-white sm:text-7xl lg:text-8xl">
              Portfolio Studio
            </p>
            <h1 className="animate-[home-rise_0.8s_ease-out_0.12s_both] max-w-xl text-xl leading-snug text-white/80 sm:text-2xl">
              Design, manage, and publish your portfolio from one place.
            </h1>
            <p className="animate-[home-rise_0.8s_ease-out_0.24s_both] max-w-md text-base leading-relaxed text-white/55">
              A portfolio CMS for builders — edit content in a dashboard, switch
              themes, and ship a live site without leaving the app.
            </p>
          </div>

          <div className="animate-[home-rise_0.8s_ease-out_0.36s_both] flex flex-col gap-3 sm:flex-row">
            <Button
              render={<Link href="/dashboard/overview" />}
              size="lg"
              className="bg-white text-black hover:bg-white/90"
            >
              Open dashboard
            </Button>
            <Button
              render={<Link href="/setup-guide" />}
              variant="outline"
              size="lg"
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              Setup guide
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
