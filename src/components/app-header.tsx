
"use client";

import Link from "next/link";
import { Menu, Settings, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { version } from "../../package.json";

interface AppHeaderProps {
  isMobile: boolean;
  onMenuClick: () => void;
  onUploadClick: () => void;
}

export function AppHeader({ isMobile, onMenuClick, onUploadClick }: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6 z-10 bg-card">
      <div className="flex items-center gap-2 sm:gap-4">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onMenuClick} aria-label="Open menu">
            <Menu className="h-6 w-6" />
          </Button>
        )}
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link href="/" className="flex items-center gap-2">
                        <FileText className="h-7 w-7 text-primary" />
                        <h1 className="text-xl font-bold tracking-tight text-foreground">
                          ConsentForm Fetcher
                        </h1>
                    </Link>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Version {version}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={onUploadClick}>
                  <Mail className="mr-2 h-4 w-4" />
                  SEND EMAILS
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Email the signed PDF to the configured recipients.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <ThemeToggle />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/config" aria-label="Go to configuration page">
                <Button variant="ghost" size="icon">
                  <Settings className="h-6 w-6" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go to configuration page</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
