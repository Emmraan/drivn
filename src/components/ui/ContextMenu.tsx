'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  children: React.ReactNode;
  className?: string;
  enableLeftClick?: boolean; // New prop to enable left-click
  itemType?: 'file' | 'folder'; // New prop to specify item type
}

export default function ContextMenu({ items, children, className, enableLeftClick = false, itemType }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({
        x: e.clientX,
        y: e.clientY,
      });
      setIsOpen(true);
    }
  };

  const handleLeftClick = (e: React.MouseEvent) => {
    // Only enable left-click for files, not folders
    if (enableLeftClick && itemType === 'file') {
      e.preventDefault();
      e.stopPropagation();

      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        setPosition({
          x: e.clientX,
          y: e.clientY,
        });
        setIsOpen(true);
      }
    }
  };

  const handleClick = (item: ContextMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      
      // Adjust position if menu would go off screen
      if (menuRef.current) {
        const menuRect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let adjustedX = position.x;
        let adjustedY = position.y;
        
        if (position.x + menuRect.width > viewportWidth) {
          adjustedX = position.x - menuRect.width;
        }
        
        if (position.y + menuRect.height > viewportHeight) {
          adjustedY = position.y - menuRect.height;
        }
        
        if (adjustedX !== position.x || adjustedY !== position.y) {
          setPosition({ x: adjustedX, y: adjustedY });
        }
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, position]);

  return (
    <>
      <div
        ref={triggerRef}
        onContextMenu={handleContextMenu}
        onClick={handleLeftClick}
        className={cn('cursor-pointer', className)}
      >
        {children}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" />
            
            {/* Menu */}
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 80 }}
              className="fixed z-50 min-w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1"
              style={{
                left: position.x,
                top: position.y,
              }}
            >
              {items.map((item, index) => (
                <React.Fragment key={item.id}>
                  {item.separator && index > 0 && (
                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                  )}
                  <button
                    onClick={() => handleClick(item)}
                    disabled={item.disabled}
                    className={cn(
                      'w-full flex items-center px-3 py-2 text-sm text-left transition-colors',
                      item.disabled
                        ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                        : item.destructive
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    {item.icon && (
                      <span className="mr-3 flex-shrink-0">
                        {item.icon}
                      </span>
                    )}
                    {item.label}
                  </button>
                </React.Fragment>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Hook for managing context menu state
export function useContextMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [targetItem, setTargetItem] = useState<{ _id: string; name: string; [key: string]: unknown } | null>(null);

  const openContextMenu = (e: React.MouseEvent, item?: { _id: string; name: string; [key: string]: unknown } | null, itemType?: 'file' | 'folder') => {
    // For left-click, only allow files
    if (e.type === 'click' && itemType !== 'file') {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    setPosition({
      x: e.clientX,
      y: e.clientY,
    });
    setTargetItem(item || null);
    setIsOpen(true);
  };

  const closeContextMenu = () => {
    setIsOpen(false);
    setTargetItem(null);
  };

  return {
    isOpen,
    position,
    targetItem,
    openContextMenu,
    closeContextMenu,
  };
}
