'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/auth/context/AuthContext';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/ui/ThemeToggle';
import {
  Bars3Icon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

interface DashboardHeaderProps {
  user: {
    _id?: string;
    email: string;
    name: string;
    emailVerified?: Date;
    image?: string;
  };
  onMenuClick: () => void;
}

export default function DashboardHeader({ user, onMenuClick }: DashboardHeaderProps) {
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button */}
          <div className="flex items-center lg:hidden">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>

          {/* Page title - will be dynamic based on current page */}
          <div className="flex-1 lg:flex-none">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white lg:hidden">
              Dashboard
            </h1>
          </div>

          {/* Right side - User menu and theme toggle */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            {/* User menu */}
            <div className="flex items-center space-x-3">
              {/* User avatar */}
              <div className="flex items-center space-x-2">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
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
                    {user.email}
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
              
              {/* Mobile logout button */}
              <button
                onClick={handleLogout}
                className="sm:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                title="Sign Out"
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
