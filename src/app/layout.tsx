import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { LogoutHandler } from '@/components/logout-handler';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ConsentForm Fetcher',
  description: 'An app to fetch and fill RCR consent forms.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
          <LogoutHandler />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
