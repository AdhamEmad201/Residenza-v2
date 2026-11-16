import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell mode="admin">{children}</DashboardShell>;
}
