'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/auth/context/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import { SkeletonDashboard } from '@/components/ui/Skeleton';
import { DashboardPageTransition } from '@/components/ui/PageTransition';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && user && !user.emailVerified) {
      router.push('/login?message=verify-email');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  if (!loading && (!user || !user.emailVerified)) {
    return null;
  }

  return (
    <DashboardPageTransition>
      <div className="min-h-screen bg-background">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <DashboardSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Header */}
          <DashboardHeader
            user={user}
            onMenuClick={() => setSidebarOpen(true)}
          />

          {/* Page content */}
          <main className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardPageTransition>
  );
}
