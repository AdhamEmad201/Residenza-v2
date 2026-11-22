'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { useAuth } from '@/lib/auth/AuthContext';
import { ACCOUNT_TYPE_LABELS } from '@/lib/api/public';

export interface DashboardShellProps {
  mode: 'portal' | 'admin';
  children: React.ReactNode;
}

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

const PORTAL_NAV: NavItem[] = [
  { href: '/portal', label: 'عقاراتي وإعلاناتي', exact: true },
  { href: '/portal/properties/new', label: 'إضافة عقار جديد' },
  { href: '/dashboard/company', label: 'هوية الشركة وصفحتي' },
  { href: '/portal/profile', label: 'الملف الشخصي والأمان' },
];

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'غرفة التحكم والنبض الحي', exact: true },
  { href: '/admin/properties', label: 'مراجعة العقارات والتنبيهات' },
  { href: '/admin/companies', label: 'الشركات والباقات والتوثيق' },
  { href: '/admin/users', label: 'إدارة الحسابات والصلاحيات' },
  { href: '/admin/leads-reports', label: 'طلبات المشترين والبلاغات' },
  { href: '/admin/settings', label: 'المناطق والبانر وسجل النشاط' },
  { href: '/admin/taxonomy', label: 'شجرة التصنيفات والمواقع' },
  { href: '/admin/properties/new', label: 'نشر عقار مباشر (OD-01)' },
];

export function DashboardShell({ mode, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (mode === 'admin') {
      if (!isAuthenticated || !user || user.role !== 'admin') {
        router.replace('/');
      }
      return;
    }
    if (!isAuthenticated || !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
    }
  }, [isLoading, isAuthenticated, user, mode, pathname, router]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  if (isLoading) {
    return (
      <div className="py-20">
        <Container>
          <div className="mx-auto max-w-md rounded-3xl bg-white p-10 text-center shadow-ambient">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#9F7753] border-t-transparent" />
            <p className="mt-4 text-sm font-bold text-[#403E3D]">
              جارٍ التحقق من جلسة الأمان وتحميل مساحة العمل...
            </p>
          </div>
        </Container>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (mode === 'admin' && user.role !== 'admin') {
    return null;
  }

  const navItems = mode === 'admin' ? ADMIN_NAV : PORTAL_NAV;

  return (
    <div className="py-8 lg:py-12">
      <Container>
        {/* Top Warm Charcoal Luxury Workspace Header */}
        <div className="bg-nile-luxury mb-8 rounded-3xl p-6 text-white shadow-ambient-lg sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-2xl bg-[#FAF7F2] px-3.5 py-1.5 shadow-xs transition hover:bg-white"
                >
                  <Image
                    src="/images/residenza-logo.svg"
                    alt="RESIDENZA"
                    width={138}
                    height={34}
                    className="h-7 w-auto sm:h-8"
                  />
                </Link>
                <span className="rounded-full bg-[#9F7753]/30 px-3.5 py-1 text-[11px] font-bold text-[#CEB38F]">
                  {mode === 'admin'
                    ? 'RESIDENZA ADMIN GOVERNANCE · سوهاج'
                    : 'RESIDENZA PUBLISHER PORTAL · بوابة المعلن'}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
                  {ACCOUNT_TYPE_LABELS[user.account_type]}
                </span>
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                {mode === 'admin'
                  ? 'لوحة الإدارة والاعتماد العقاري'
                  : `مرحباً، ${user.name}`}
              </h1>
              {user.company_name && (
                <p className="mt-1 text-xs text-[#CEB38F]">{user.company_name}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {mode === 'portal' && user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="rounded-full bg-[#9F7753] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#8A6346]"
                >
                  الانتقال للوحة الإدارة
                </Link>
              )}

              {mode === 'admin' && (
                <Link
                  href="/portal"
                  className="rounded-full bg-white/15 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/25"
                >
                  بوابة عقاراتي
                </Link>
              )}

              <Link
                href="/properties"
                className="rounded-full bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20"
              >
                معرض العقارات العام &#8592;
              </Link>

              <button
                type="button"
                onClick={() => setDrawerOpen((prev) => !prev)}
                aria-expanded={drawerOpen}
                className="cursor-pointer rounded-full bg-white/15 px-4 py-2.5 text-xs font-bold text-[#CEB38F] lg:hidden"
              >
                {drawerOpen ? 'إغلاق القائمة' : 'قائمة الأقسام'}
              </button>
            </div>
          </div>

          {/* Desktop Pill Bar Navigation */}
          <nav
            aria-label={mode === 'admin' ? 'تنقل لوحة الإدارة' : 'تنقل بوابة المستخدم'}
            className="mt-6 hidden flex-wrap items-center gap-2 border-t border-white/10 pt-5 lg:flex"
          >
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-5 py-2.5 text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#9F7753] text-white shadow-md'
                      : 'bg-white/8 text-white/80 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Drawer Navigation */}
          {drawerOpen && (
            <nav
              aria-label="قائمة أقسام اللوحة للجوال"
              className="mt-5 flex flex-col gap-2 border-t border-white/15 pt-4 lg:hidden"
            >
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold transition ${
                      isActive
                        ? 'bg-[#9F7753] text-white'
                        : 'bg-white/8 text-white/85 hover:bg-white/15'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span>&#8592;</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Main Workspace Surface */}
        <div>{children}</div>
      </Container>
    </div>
  );
}
