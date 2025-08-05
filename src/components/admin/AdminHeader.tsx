'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/auth/context/AuthContext';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/ui/ThemeToggle';
import {
  Bars3Icon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';

interface AdminHeaderProps {
  user: {
    _id?: string;
    email: string;
    name: string;
    emailVerified?: Date;
    image?: string;
  };
  onMenuClick: () => void;
}

export default function AdminHeader({ user, onMenuClick }: AdminHeaderProps) {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side */}
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Breadcrumb / Title */}
            <div className="ml-4 lg:ml-0">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Back to Dashboard */}
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<HomeIcon className="h-4 w-4" />}
                className="hidden sm:flex"
              >
                User Dashboard
              </Button>
            </Link>

            {/* Theme toggle */}
            <ThemeToggle />
            
            {/* User menu */}
            <div className="flex items-center space-x-3">
              {/* User avatar */}
              <div className="flex items-center space-x-2">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                )}
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Admin • {user.email}
                  </div>
                </div>
              </div>

              {/* Logout button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                leftIcon={<ArrowRightOnRectangleIcon className="h-4 w-4" />}
                className="hidden sm:flex"
              >
                Sign Out
              </Button>

              {/* Mobile logout */}
              <button
                onClick={handleLogout}
                className="sm:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
