"use client";

interface DashboardContentProps {
  children: React.ReactNode;
  innerClassName?: string;
}

export function DashboardContent({ children, innerClassName = "" }: DashboardContentProps) {
  return (
    <div className="max-w-lg mx-auto min-h-full">
      <div className={`min-w-0 ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
}
