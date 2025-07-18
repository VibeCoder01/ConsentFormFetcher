"use client";

import type { ConsentForm, ConsentFormCategory } from "@/lib/types";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import config from "@/config/app.json";

interface FormListProps {
  formCategories: ConsentFormCategory[];
  onSelectForm: (form: ConsentForm) => void;
  selectedFormUrl?: string;
}

export function FormList({ formCategories, onSelectForm, selectedFormUrl }: FormListProps) {
  return (
      <div className="p-2 md:p-4 h-full">
        <h2 className="px-2 text-lg font-semibold tracking-tight mb-2">
          Available Forms
        </h2>
        <Accordion type="multiple" className="w-full" defaultValue={formCategories.map(c => c.category)}>
          {formCategories.map((category) => (
            <AccordionItem value={category.category} key={category.category}>
              <AccordionTrigger className="hover:no-underline text-base px-2">
                {category.category}
              </AccordionTrigger>
              <AccordionContent className="pb-1">
                <div className="flex flex-col gap-1 pl-2">
                  {category.forms.map((form) => {
                    const fullUrl = `${config.rcrBaseUrl}${form.url}`;
                    return (
                      <Button
                        key={form.url}
                        variant={
                          selectedFormUrl === fullUrl ? "secondary" : "ghost"
                        }
                        className="h-auto w-full justify-start text-left whitespace-normal"
                        onClick={() => onSelectForm(form)}
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
