// src/components/ui/dialog.tsx
"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogHeaderProps {
  children: React.ReactNode;
}

interface DialogTitleProps {
  children: React.ReactNode;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
}

interface DialogFooterProps {
  children: React.ReactNode;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />
          {/* Content */}
          {children}
        </div>
      )}
    </AnimatePresence>
  );
};

const DialogContent = ({ children, className = "" }: DialogContentProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`
        relative z-50 w-full max-w-md mx-4 
        bg-white dark:bg-slate-900 
        rounded-2xl border border-slate-200 dark:border-slate-800 
        shadow-2xl backdrop-blur-xl
        ${className}
      `}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </motion.div>
  );
};

const DialogHeader = ({ children }: DialogHeaderProps) => {
  return (
    <div className="px-6 pt-6 pb-2">
      {children}
    </div>
  );
};

const DialogTitle = ({ children }: DialogTitleProps) => {
  return (
    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
      {children}
    </h2>
  );
};

const DialogDescription = ({ children }: DialogDescriptionProps) => {
  return (
    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
      {children}
    </p>
  );
};

const DialogFooter = ({ children }: DialogFooterProps) => {
  return (
    <div className="px-6 pb-6 pt-4 flex gap-3 justify-end">
      {children}
    </div>
  );
};

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};