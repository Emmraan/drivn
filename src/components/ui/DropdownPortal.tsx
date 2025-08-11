'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface DropdownPortalProps {
  children: React.ReactNode;
  isOpen: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  className?: string;
  fallbackToInline?: boolean;
  onClickOutside?: () => void;
}

export default function DropdownPortal({
  children,
  isOpen,
  triggerRef,
  className = '',
  fallbackToInline = false,
  onClickOutside
}: DropdownPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle click outside when using portal
  useEffect(() => {
    if (isOpen && onClickOutside && mounted) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;

        // Check if click is outside both the trigger and the dropdown
        const isOutsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
        const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);

        if (isOutsideTrigger && isOutsideDropdown) {
          onClickOutside();
        }
      };

      // Use a small delay to ensure the portal is rendered
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClickOutside, mounted, triggerRef]);

  useEffect(() => {
    if (isOpen && triggerRef.current && mounted) {
      const updatePosition = () => {
        const rect = triggerRef.current!.getBoundingClientRect();
        setPosition({
          top: rect.bottom + window.scrollY + 8, // 8px gap
          left: rect.right - 256 + window.scrollX, // 256px is dropdown width (w-64)
          width: 256
        });
      };

      updatePosition();
      
      // Update position on scroll and resize
      const handleUpdate = () => updatePosition();
      window.addEventListener('scroll', handleUpdate);
      window.addEventListener('resize', handleUpdate);
      
      return () => {
        window.removeEventListener('scroll', handleUpdate);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isOpen, triggerRef, mounted]);

  if (!mounted || !isOpen) {
    return null;
  }

  // Fallback to inline positioning if portal fails or is disabled
  if (fallbackToInline || typeof window === 'undefined') {
    return (
      <div className={`absolute dropdown-menu-top right-0 mt-2 ${className}`}>
        {children}
      </div>
    );
  }

  const portalContent = (
    <div
      ref={dropdownRef}
      className={`fixed dropdown-menu-top ${className}`}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 9999
      }}
    >
      {children}
    </div>
  );

  try {
    return createPortal(portalContent, document.body);
  } catch (error) {
    // Fallback to inline if portal fails
    console.warn('Portal failed, falling back to inline dropdown:', error);
    return (
      <div className={`absolute dropdown-menu-top right-0 mt-2 ${className}`}>
        {children}
      </div>
    );
  }
}
