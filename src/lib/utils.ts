import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Copies a string to the clipboard.
 * Uses the modern Clipboard API if available, with a fallback to the legacy `execCommand`.
 * @param text The string to copy to the clipboard.
 * @returns {Promise<boolean>} A promise that resolves to `true` if successful, `false` otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try the modern Clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error("Failed to copy with navigator.clipboard:", err);
      // Fall through to the legacy method
    }
  }

  // Fallback to the legacy `document.execCommand('copy')`
  const textArea = document.createElement("textarea");
  textArea.value = text;

  // Make the textarea out of sight
  textArea.style.position = "fixed";
  textArea.style.top = "-9999px";
  textArea.style.left = "-9999px";
  
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback copy method failed:", err);
    document.body.removeChild(textArea);
    return false;
  }
}

    