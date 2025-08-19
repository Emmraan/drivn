'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/auth/context/AuthContext';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { UserCircleIcon, CameraIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ProfilePage() {
  const { user, loading, updateUserProfile, updateUserPassword } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setProfileImage(user.image || null);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors({ image: 'Please select an image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ image: 'Image size should be less than 5MB' });
      return;
    }

    setIsUploading(true);
    setErrors({});

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      setProfileImage(base64Data);
      updateProfileImage(base64Data);
    };
    reader.onerror = () => {
      setErrors({ image: 'Failed to read the image file' });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const updateProfileImage = async (imageData: string) => {
    try {
      const response = await fetch('/api/user/profile/image', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      });

      const data = await response.json();

      if (data.success) {
        updateUserProfile({ image: imageData });
        setSuccessMessage('Profile image updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors({ image: data.message || 'Failed to update profile image' });
      }
    } catch (error) {
      setErrors({ image: 'An error occurred while updating profile image' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsUpdating(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      const data = await response.json();

      if (data.success) {
        updateUserProfile({ name, email });
        setSuccessMessage('Profile updated successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors({ general: data.message || 'Failed to update profile' });
      }
    } catch (error) {
      setErrors({ general: 'An error occurred while updating profile' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (newPassword.length < 8) {
      setErrors({ newPassword: 'Password must be at least 8 characters long' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setIsChangingPassword(true);

    try {
      const data = await updateUserPassword(currentPassword, newPassword);

      if (data.success) {
        setSuccessMessage('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrors({ password: data.message || 'Failed to change password' });
      }
    } catch (error) {
      setErrors({ password: 'An error occurred while changing password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center justify-between"
        >
          <div className="flex items-center">
            <CheckIcon className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-green-700 hover:text-green-900"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Image Section */}
        <div className="glass p-6 rounded-lg shadow-md">
          <h2 className="text-xl text-center font-semibold mb-4">Profile Picture</h2>
          <div className="flex flex-col items-center">
            <div
              className="relative w-32 h-32 rounded-full overflow-hidden mb-4 cursor-pointer group"
              onClick={handleImageClick}
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
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraIcon className="h-8 w-8 text-white" />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleImageClick}
              loading={isUploading}
              loadingText="Uploading..."
            >
              Change Picture
            </Button>
            {errors.image && (
              <p className="mt-2 text-sm text-red-600">{errors.image}</p>
            )}
          </div>
        </div>

        {/* Profile Information Section */}
        <div className="glass p-6 rounded-lg shadow-md md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
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
                <Button
                  type="submit"
                  loading={isUpdating}
                  loadingText="Updating..."
                >
                  Update Profile
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* Password Change Section */}
        <div className="glass p-6 rounded-lg shadow-md md:col-span-3">
          <h2 className="text-xl font-semibold mb-4">Change Password</h2>
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
              <Button
                type="submit"
                variant="secondary"
                loading={isChangingPassword}
                loadingText="Changing Password..."
              >
                Change Password
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}