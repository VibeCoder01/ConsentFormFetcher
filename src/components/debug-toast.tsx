
"use client";

import { useState } from 'react';
import { Button } from './ui/button';
import { copyToClipboard } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DebugToastProps {
  data: any;
}

export const DebugToast = ({ data }: DebugToastProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const dataAsString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    const success = await copyToClipboard(dataAsString);
    if (success) {
      setCopied(true);
      toast({
          title: "Copied!",
          description: "API response copied to clipboard.",
          duration: 2000,
      })
    } else {
        toast({
            variant: "destructive",
            title: "Copy Failed",
            description: "Could not copy response to clipboard.",
            duration: 3000,
        })
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <p className="text-sm">Raw response from the KOMS API:</p>
      <pre className="mt-2 w-full rounded-md bg-slate-950 p-4">
        <code className="text-white text-xs">{dataAsString}</code>
      </pre>
      <Button size="sm" onClick={handleCopy} className="w-fit">
        {copied ? 'Copied!' : 'Copy to Clipboard'}
      </Button>
    </div>
  );
};
