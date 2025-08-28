"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { logger } from "@/utils/logger";

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
  className = "",
  fallbackToInline = false,
  onClickOutside,
}: DropdownPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && onClickOutside && mounted) {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        const isOutsideTrigger =
          triggerRef.current && !triggerRef.current.contains(target);
        const isOutsideDropdown =
          dropdownRef.current && !dropdownRef.current.contains(target);

        if (isOutsideTrigger && isOutsideDropdown) {
          onClickOutside();
        }
      };

      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClickOutside, mounted, triggerRef]);

  useEffect(() => {
    if (isOpen && triggerRef.current && mounted) {
      const updatePosition = () => {
        const rect = triggerRef.current!.getBoundingClientRect();
        setPosition({
          top: rect.bottom + window.scrollY + 8,
          left: rect.right - 256 + window.scrollX,
          width: 256,
        });
      };

      updatePosition();

      const handleUpdate = () => updatePosition();
      window.addEventListener("scroll", handleUpdate);
      window.addEventListener("resize", handleUpdate);

      return () => {
        window.removeEventListener("scroll", handleUpdate);
        window.removeEventListener("resize", handleUpdate);
      };
    }
  }, [isOpen, triggerRef, mounted]);

  if (!mounted || !isOpen) {
    return null;
  }

  if (fallbackToInline || typeof window === "undefined") {
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
        zIndex: 9999,
      }}
    >
      {children}
    </div>
  );

  try {
    return createPortal(portalContent, document.body);
  } catch (error) {
    logger.warn("Portal failed, falling back to inline dropdown:", error);
    return (
      <div className={`absolute dropdown-menu-top right-0 mt-2 ${className}`}>
        {children}
      </div>
    );
  }
}
