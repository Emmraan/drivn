"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { useAuth } from "@/auth/context/AuthContext";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import {
  UserCircleIcon,
  CameraIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { ProfileSkeleton } from "@/components/ui/Skeleton";

export default function ProfilePage() {
  const { user, loading, updateUserProfile, updateUserPassword } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [hasS3Config, setHasS3Config] = useState<boolean | null>(null);
  const [showSkeletonLoader, setShowSkeletonLoader] = useState(true);

  useEffect(() => {
    if (user) {
      if (profileImage && profileImage.startsWith("blob:")) {
        URL.revokeObjectURL(profileImage);
      }
      setName(user.name || "");
      setEmail(user.email || "");
      setProfileImage(user.image || null);

      if (user.s3Config) {
        setHasS3Config(true);
      } else {
        setHasS3Config(false);
      }
    }
  }, [user, profileImage]);

  useEffect(() => {
    return () => {
      if (profileImage && profileImage.startsWith("blob:")) {
        URL.revokeObjectURL(profileImage);
      }
    };
  }, [profileImage]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setShowSkeletonLoader(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowSkeletonLoader(true);
    }
  }, [loading]);

  if (loading || showSkeletonLoader) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    router.push("/");
    return null;
  }

  const handleImageClick = () => {
    if (!hasS3Config) {
      router.push("/dashboard/settings");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrors({ image: "Please select an image file" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ image: "Image size should be less than 5MB" });
      return;
    }

    setIsUploading(true);
    setErrors({});

    const previewUrl = URL.createObjectURL(file);
    setProfileImage(previewUrl);

    updateProfileImage(file);
  };

  const updateProfileImage = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/user/profile/image", {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        updateUserProfile({ image: data.user.image });
        setProfileImage(data.user.image);
        setSuccessMessage("Profile image updated successfully");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrors({ image: data.message || "Failed to update profile image" });
        setProfileImage(user?.image || null);
      }
    } catch (error) {
      setErrors({ image: "An error occurred while updating profile image" });
      console.log(error);
      setProfileImage(user?.image || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsUpdating(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json();

      if (data.success) {
        updateUserProfile({ name, email });
        setSuccessMessage("Profile updated successfully");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrors({ general: data.message || "Failed to update profile" });
      }
    } catch (error) {
      setErrors({ general: "An error occurred while updating profile" });
      console.log(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (newPassword.length < 8) {
      setErrors({ newPassword: "Password must be at least 8 characters long" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setIsChangingPassword(true);

    try {
      const data = await updateUserPassword(currentPassword, newPassword);

      if (data.success) {
        setSuccessMessage("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrors({ password: data.message || "Failed to change password" });
      }
    } catch (error) {
      setErrors({ password: "An error occurred while changing password" });
      console.log(error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto px-4 py-8"
    >
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-2xl font-bold mb-6"
      >
        Profile Settings
      </motion.h1>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center justify-between"
        >
          <div className="flex items-center">
            <CheckIcon className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
          <button
            onClick={() => setSuccessMessage("")}
            className="text-green-700 hover:text-green-900"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Image Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass p-6 rounded-lg shadow-md"
        >
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="text-xl text-center font-semibold mb-4"
          >
            Profile Picture
          </motion.h2>
          <div className="flex flex-col items-center">
            <motion.div
              className="relative w-32 h-32 rounded-full overflow-hidden mb-4 cursor-pointer group"
              onClick={handleImageClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                  <UserCircleIcon className="h-20 w-20 text-gray-400" />
                </div>
              )}
              <motion.div
                className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <CameraIcon className="h-8 w-8 text-white" />
              </motion.div>
            </motion.div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
            {hasS3Config === null ? (
              <div className="mt-2 flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600"></div>
                <span className="text-sm text-gray-600">
                  Checking S3 configuration...
                </span>
              </div>
            ) : hasS3Config === false ? (
              <p className="mt-2 text-sm text-amber-600">
                ⚠️ S3 storage not configured. Images will be optimized and
                stored on your S3 bucket.
                <br />
                <Link
                  href="/dashboard/settings"
                  className="text-blue-600 hover:underline"
                >
                  Configure S3 settings
                </Link>
              </p>
            ) : null}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Button
                size="sm"
                variant="secondary"
                onClick={handleImageClick}
                loading={isUploading}
                loadingText="Uploading..."
                disabled={hasS3Config === null || hasS3Config === false}
              >
                {hasS3Config === null
                  ? "Checking..."
                  : hasS3Config
                  ? "Change Picture"
                  : "Configure S3 First"}
              </Button>
            </motion.div>
            {errors.image && (
              <p className="mt-2 text-sm text-red-600">{errors.image}</p>
            )}
          </div>
        </motion.div>

        {/* Profile Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="glass p-6 rounded-lg shadow-md md:col-span-2"
        >
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="text-xl font-semibold mb-4"
          >
            Personal Information
          </motion.h2>
          <form onSubmit={handleProfileUpdate}>
            <div className="space-y-4">
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                error={errors.name}
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                error={errors.email}
              />
              {errors.general && (
                <p className="text-sm text-red-600">{errors.general}</p>
              )}
              <div className="pt-2">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Button
                    type="submit"
                    loading={isUpdating}
                    loadingText="Updating..."
                  >
                    Update Profile
                  </Button>
                </motion.div>
              </div>
            </div>
          </form>
        </motion.div>

        {/* Password Change Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass p-6 rounded-lg shadow-md md:col-span-3"
        >
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="text-xl font-semibold mb-4"
          >
            Change Password
          </motion.h2>
          <form onSubmit={handlePasswordChange}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                error={errors.currentPassword}
              />
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                error={errors.newPassword}
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                error={errors.confirmPassword}
              />
            </div>
            {errors.password && (
              <p className="mt-2 text-sm text-red-600">{errors.password}</p>
            )}
            <div className="mt-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Button
                  type="submit"
                  variant="secondary"
                  loading={isChangingPassword}
                  loadingText="Changing Password..."
                >
                  Change Password
                </Button>
              </motion.div>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}
