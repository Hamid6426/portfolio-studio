import Image from "next/image";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative flex min-h-screen w-full flex-1 items-center justify-center overflow-hidden bg-black px-6 py-16 text-white">
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

<main className="relative z-10 w-full max-w-2xl">

            {children}
        </main>
        </div>
    );
}