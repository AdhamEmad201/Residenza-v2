'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Container } from './Container';
import { useAuth } from '@/lib/auth/AuthContext';
import { ACCOUNT_TYPE_LABELS } from '@/lib/api/public';

const NAV_ITEMS = [
  { href: '/', label: 'الرئيسية' },
  { href: '/properties', label: 'العقارات' },
  { href: '/companies', label: 'الشركات والمطورون' },
  { href: '/categories', label: 'التصنيفات' },
  { href: '/locations', label: 'وجهات سوهاج' },
  { href: '/about', label: 'عن ريزيدنزا' },
  { href: '/contact', label: 'تواصل معنا' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 36;
      setIsScrolled((prev) => (prev !== next ? next : prev));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setMobileMenuOpen(false);
      router.push('/');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 transition-[padding,background-color,box-shadow] duration-200 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-ambient py-2.5'
          : 'bg-[#FAF7F2]/92 backdrop-blur-md py-4'
      }`}
    >
      <Container>
        <div className="flex items-center justify-between gap-3">
          {/* Official RESIDENZA Brand SVG Identity */}
          <Link
            href="/"
            className="group flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9F7753]"
          >
            <Image
              src="/images/residenza-logo.svg"
              alt="RESIDENZA"
              width={162}
              height={40}
              priority
              className="h-9 w-auto transition-transform duration-300 group-hover:scale-[1.02] sm:h-10"
            />
          </Link>

          {/* Floating Pill Navigation */}
          <nav
            aria-label="القائمة الرئيسية"
            className="hidden items-center gap-1 rounded-full bg-[#F3EAD8]/90 p-1.5 lg:flex"
          >
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#403E3D] text-white shadow-xs'
                      : 'text-[#5C5855] hover:bg-white/75 hover:text-[#403E3D]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Auth Pill Actions */}
          <div className="hidden items-center gap-3 lg:flex">
            {!isLoading && isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[#F3EAD8] px-4 py-1.5 text-start">
                  <p className="text-xs font-bold text-[#403E3D]">{user.name}</p>
                  <p className="text-[10px] font-semibold text-[#8A6346]">
                    {ACCOUNT_TYPE_LABELS[user.account_type] || 'عضو مسجل'}
                  </p>
                </div>

                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="rounded-full bg-[#F3EAD8] px-4 py-2.5 text-xs font-bold text-[#8A6346] transition-all hover:bg-[#9F7753] hover:text-white"
                  >
                    لوحة الإدارة
                  </Link>
                )}

                <Link
                  href="/portal"
                  className="rounded-full bg-[#403E3D] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#2F2D2C] active:scale-[0.98]"
                >
                  بوابة حسابي
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="cursor-pointer rounded-full px-3 py-2 text-xs font-bold text-[#7D7772] transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                >
                  {isLoggingOut ? 'جارٍ الخروج...' : 'خروج'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2.5 text-xs font-bold text-[#403E3D] transition-all hover:bg-[#F3EAD8]"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-[#9F7753] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-300 hover:bg-[#8A6346] hover:shadow-md active:scale-[0.98]"
                >
                  أضف عقارك
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Pill Drawer Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="فتح أو إغلاق القائمة"
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[#F3EAD8] text-[#403E3D] transition hover:bg-[#CEB38F]/40 lg:hidden"
          >
            {mobileMenuOpen ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Floating Rounded Drawer */}
        {mobileMenuOpen && (
          <div className="mt-4 rounded-3xl bg-white p-5 shadow-ambient-lg lg:hidden">
            <nav aria-label="قائمة الجوال" className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      isActive
                        ? 'bg-[#403E3D] text-white'
                        : 'text-[#403E3D] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-[#9F7753]">&#8592;</span>
                  </Link>
                );
              })}
            </nav>

            <div className="mt-4 pt-4">
              {!isLoading && isAuthenticated && user ? (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-[#FAF7F2] px-4 py-3">
                    <p className="text-sm font-bold text-[#403E3D]">{user.name}</p>
                    <p className="text-xs text-[#8A6346]">
                      {ACCOUNT_TYPE_LABELS[user.account_type] || 'عضو مسجل'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {user.role === 'admin' && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className="col-span-2 rounded-full bg-[#9F7753] py-3 text-center text-xs font-bold text-white"
                      >
                        لوحة الإدارة
                      </Link>
                    )}
                    <Link
                      href="/portal"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-full bg-[#403E3D] py-3 text-center text-xs font-bold text-white"
                    >
                      بوابة حسابي
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="cursor-pointer rounded-full bg-red-50 py-3 text-center text-xs font-bold text-red-700"
                    >
                      {isLoggingOut ? 'جارٍ الخروج...' : 'تسجيل الخروج'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-full bg-[#F3EAD8] py-3 text-center text-xs font-bold text-[#403E3D]"
                  >
                    تسجيل الدخول
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-full bg-[#9F7753] py-3 text-center text-xs font-bold text-white"
                  >
                    أضف عقارك
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
