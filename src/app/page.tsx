"use client";

import { useState, useEffect } from "react";
import type { ConsentForm, ConsentFormCategory } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { AppHeader } from "@/components/app-header";
import { FormList } from "@/components/form-list";
import { ConsentFormViewer } from "@/components/consent-form-viewer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [formCategories, setFormCategories] = useState<ConsentFormCategory[]>([]);
  const [selectedForm, setSelectedForm] = useState<ConsentForm | null>(null);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch("/consent-forms.json")
      .then((res) => res.json())
      .then((data: ConsentFormCategory[]) => {
        setFormCategories(data);
        setIsLoading(false);
      })
      .catch(console.error);
  }, []);

  const handleSelectForm = (form: ConsentForm) => {
    setSelectedForm(form);
    if (isMobile) {
      setSheetOpen(false);
    }
  };

  const formListComponent = (
    <FormList
      formCategories={formCategories}
      onSelectForm={handleSelectForm}
      selectedFormUrl={selectedForm?.url}
    />
  );
  
  const loadingComponent = (
    <div className="p-4">
      <h2 className="px-4 text-lg font-semibold tracking-tight mb-4">Available Forms</h2>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="pl-4 space-y-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-5/6" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh w-full flex-col bg-background">
      <AppHeader
        isMobile={isMobile}
        onMenuClick={() => setSheetOpen(true)}
      />
      <main className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-1/3 md:max-w-sm flex-col border-r bg-card">
          <div className="flex-1 overflow-y-auto">
            {isLoading ? loadingComponent : formListComponent}
          </div>
        </aside>

        {/* Mobile Sheet */}
        <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="p-0 w-[85%] sm:w-96 bg-card">
             <div className="overflow-y-auto h-full">
              {isLoading ? loadingComponent : formListComponent}
             </div>
          </SheetContent>
        </Sheet>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <ConsentFormViewer form={selectedForm} />
        </div>
      </main>
    </div>
  );
}
