import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthProvider } from "@/lib/auth/AuthContext";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ريزيدنزا | أسلوب الحياة العقاري الفاخر في سوهاج",
    template: "%s | ريزيدنزا سوهاج",
  },
  description:
    "منصة عقارية فاخرة ومعتمدة لبيع وإيجار الوحدات السكنية والفيلات والمقرات التجارية والإدارية والأراضي في محافظة سوهاج ومدينة سوهاج الجديدة بشفافية مالية كاملة.",
  keywords: [
    "عقارات سوهاج",
    "شقق للبيع في سوهاج",
    "مدينة سوهاج الجديدة",
    "ريزيدنزا",
    "RESIDENZA",
    "أراضي سوهاج",
    "عقارات الصعيد",
  ],
  openGraph: {
    title: "ريزيدنزا | أسلوب الحياة العقاري الفاخر في سوهاج",
    description:
      "اكتشف العقارات المعتمدة للنشر في مدينة سوهاج، سوهاج الجديدة، الكوثر، أخميم، طهطا، جرجا وجميع مراكز سوهاج بشفافية مالية كاملة.",
    locale: "ar_EG",
    type: "website",
    siteName: "RESIDENZA ريزيدنزا",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${cairo.variable} font-sans antialiased bg-[#FAF7F2] text-[#131E26] min-h-screen overflow-x-hidden selection:bg-[#C59B4E]/20`}
      >
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
