"use client";

import Link from "next/link";
import { Menu, Settings, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  isMobile: boolean;
  onMenuClick: () => void;
}

export function AppHeader({ isMobile, onMenuClick }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6 z-10 bg-card">
      <div className="flex items-center gap-2 sm:gap-4">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </Button>
        )}
        <Link href="/" className="flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              ConsentForm Fetcher
            </h1>
        </Link>
      </div>
      <Link href="/config" aria-label="Go to configuration page">
        <Button variant="ghost" size="icon">
          <Settings className="h-6 w-6" />
        </Button>
      </Link>
    </header>
  );
}
