"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/auth/context/AuthContext";
import ThemeToggle from "@/components/ui/ThemeToggle";
import DropdownPortal from "@/components/ui/DropdownPortal";
import { isUserAdmin, getUserRole } from "@/utils/clientAuth";
import {
  Bars3Icon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  CogIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

interface DashboardHeaderProps {
  user: {
    _id?: string;
    email: string;
    name: string;
    emailVerified?: Date;
    image?: string;
    role?: string;
    isAdmin?: boolean;
  };
  onMenuClick: () => void;
}

export default function DashboardHeader({
  user,
  onMenuClick,
}: DashboardHeaderProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const isAdmin = isUserAdmin(user);
  const userRole = getUserRole(user);

  const handleCloseDropdown = () => {
    setIsProfileOpen(false);
  };

  const handleLogout = async () => {
    try {
      setIsProfileOpen(false);
      await logout();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleAdminDashboard = () => {
    setIsProfileOpen(false);
    setTimeout(() => {
      router.push("/admin-dashboard");
    }, 100);
  };

  const handleSettings = () => {
    setIsProfileOpen(false);
    setTimeout(() => {
      router.push("/dashboard/settings");
    }, 100);
  };

  const handleProfile = () => {
    setIsProfileOpen(false);
    setTimeout(() => {
      router.push("/dashboard/profile");
    }, 100);
  };

  return (
    <header className="dashboard-header bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center gap-2 h-16">
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

          {/* Right side - Theme toggle and profile menu */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />

            {/* Profile Dropdown */}
            <div ref={profileRef} className="dropdown-container">
              <motion.button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                {/* User avatar */}
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

                {/* User info - hidden on mobile */}
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {userRole}
                  </div>
                </div>

                {/* Dropdown arrow */}
                <ChevronDownIcon
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                    isProfileOpen ? "rotate-180" : ""
                  }`}
                />
              </motion.button>

              {/* Dropdown Menu */}
              <DropdownPortal
                isOpen={isProfileOpen}
                triggerRef={profileRef}
                onClickOutside={handleCloseDropdown}
                className="overflow-hidden w-64 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
              >
                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      {/* User Info Header */}
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt={user.name}
                              width={40}
                              height={40}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <UserCircleIcon className="h-10 w-10 text-gray-400" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </p>
                            {isAdmin && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-300 text-primary-800 dark:bg-primary-900 dark:text-primary-200 mt-1">
                                <ShieldCheckIcon className="h-3 w-3 mr-1" />
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        {/* Profile */}
                        <motion.button
                          onClick={handleProfile}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 flex items-center space-x-3 rounded-md"
                          whileHover={{ x: 4 }}
                        >
                          <UserIcon className="h-4 w-4" />
                          <span>Profile</span>
                        </motion.button>

                        {/* Settings */}
                        <motion.button
                          onClick={handleSettings}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 flex items-center space-x-3 rounded-md"
                          whileHover={{ x: 4 }}
                        >
                          <CogIcon className="h-4 w-4" />
                          <span>Settings</span>
                        </motion.button>

                        {/* Admin Dashboard - only show for admin users */}
                        {isAdmin && (
                          <motion.button
                            onClick={handleAdminDashboard}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-primary-100 dark:hover:bg-primary-900/40 flex items-center space-x-3 rounded-md"
                            whileHover={{ x: 4 }}
                          >
                            <ShieldCheckIcon className="h-4 w-4" />
                            <span>Admin Dashboard</span>
                          </motion.button>
                        )}

                        {/* Divider */}
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

                        {/* Logout */}
                        <motion.button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-3 rounded-md"
                          whileHover={{ x: 4 }}
                        >
                          <ArrowRightOnRectangleIcon className="h-4 w-4" />
                          <span>Sign Out</span>
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </DropdownPortal>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
