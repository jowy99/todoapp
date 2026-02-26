import { Footer } from "@/components/footer/Footer";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      {children}
      <Footer variant="full" />
    </div>
  );
}
