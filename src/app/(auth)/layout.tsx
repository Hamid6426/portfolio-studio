import Image from "next/image";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-1 relative min-h-screen w-full overflow-hidden items-center justify-center px-6 py-16">
            <Image
                src="/bg-2.avif"
                alt="Background Image"
                fill
                priority
                className="object-cover fixed left-0 right-0 inset-0 top-0  -z-10"
            />
            {children}
        </div>
    );
}