
"use client";

import type { ConsentForm, ConsentFormCategory } from "@/lib/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FormListProps {
  formCategories: ConsentFormCategory[];
  onSelectForm: (form: ConsentForm) => void;
  selectedFormUrl?: string | null;
  disabled?: boolean;
}

export function FormList({ formCategories, onSelectForm, selectedFormUrl, disabled = false }: FormListProps) {
  return (
      <div className="p-2 md:p-4 h-full">
        <h2 className="px-2 text-lg font-semibold tracking-tight mb-2">
          Available Forms
        </h2>
        <Accordion type="multiple" className="w-full" disabled={disabled}>
          {formCategories.map((category) => (
            <AccordionItem value={category.category} key={category.category}>
              <AccordionTrigger className="hover:no-underline text-base px-2">
                {category.category}
              </AccordionTrigger>
              <AccordionContent className="pb-1">
                <div className="flex flex-col gap-1 pl-2">
                  {category.forms.map((form) => {
                    return (
                      <Button
                        key={form.url}
                        variant={selectedFormUrl === form.url ? "secondary" : "ghost"}
                        className={cn(
                          "h-auto w-full justify-start text-left whitespace-normal",
                           selectedFormUrl === form.url && "font-bold"
                        )}
                        onClick={() => onSelectForm(form)}
                        disabled={disabled}
                      >
                        {form.title}
                      </Button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
  );
}

    
