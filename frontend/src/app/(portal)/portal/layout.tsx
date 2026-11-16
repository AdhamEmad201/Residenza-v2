import React from 'react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell mode="portal">{children}</DashboardShell>;
}
