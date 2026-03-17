"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "@/i18n/routing";

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
  onBack?: () => void;
}

export function PageHeader({ title, children, onBack }: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) return onBack();
    router.back();
  };

  return (
    <header className="shrink-0 border-b border-border px-6 bg-muted/30 backdrop-blur-lg">
      <div className="flex items-center py-3 max-w-lg mx-auto">
        <button
          onClick={handleBack}
          className="flex items-center justify-center h-10 w-10 -ml-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold flex-1 ml-3 truncate">{title}</h1>
        {children}
      </div>
    </header>
  );
}
