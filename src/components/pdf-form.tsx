
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";

export interface PdfField {
    name: string;
    matchedKey: string | null;
}

interface PdfFormProps {
    formTitle: string;
    fields: PdfField[];
    initialData: Record<string, string>;
    isSubmitting: boolean;
    onSubmit: (formData: Record<string, string>) => void;
}

export function PdfForm({ formTitle, fields, initialData, isSubmitting, onSubmit }: PdfFormProps) {
    const [formData, setFormData] = useState(initialData);

    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    const handleChange = (fieldName: string, value: string) => {
        setFormData(prev => ({...prev, [fieldName]: value}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    }

    return (
        <div className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
                <CardTitle>{formTitle}</CardTitle>
                <CardDescription>Review and edit the pre-filled data before generating the PDF.</CardDescription>
            </CardHeader>
            <ScrollArea className="flex-grow">
                <CardContent>
                    <form onSubmit={handleSubmit} id="pdf-data-form">
                        <div className="space-y-4">
                            {fields.map(field => (
                                <div key={field.name} className="grid w-full items-center gap-1.5">
                                    <Label htmlFor={field.name} className="text-xs text-muted-foreground truncate">
                                        {field.name}
                                        {field.matchedKey && (
                                            <span className="text-primary/80 font-medium"> - matched with - {field.matchedKey}</span>
                                        )}
                                    </Label>
                                    <Input
                                        type="text"
                                        id={field.name}
                                        name={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleChange(field.name, e.target.value)}
                                        className="text-base"
                                    />
                                </div>
                            ))}
                        </div>
                    </form>
                </CardContent>
            </ScrollArea>
            <CardFooter className="flex-shrink-0 border-t pt-6">
                <Button type="submit" form="pdf-data-form" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit & Open PDF
                </Button>
            </CardFooter>
        </div>
    );
}

export function PdfFormSkeleton() {
    return (
        <div className="h-full flex flex-col">
            <CardHeader>
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
                 <div className="space-y-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
            </CardContent>
             <CardFooter className="border-t pt-6">
                <Skeleton className="h-10 w-40" />
            </CardFooter>
        </div>
    )
}

    