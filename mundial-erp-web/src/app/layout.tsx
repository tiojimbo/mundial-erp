import type { Metadata } from 'next';
import { Inter as FontSans } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { ThemeProvider } from 'next-themes';
import { cn } from '@/lib/cn';
import { Provider as TooltipProvider } from '@/components/ui/tooltip';
import { NotificationProvider } from '@/components/ui/notification-provider';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { ThemeColorProvider } from '@/providers/theme-color-provider';
import { GlobalCommandMenu } from '@/components/layout/command-menu';
import { siteConfig } from '@/config/site';

const inter = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
});

const geistMono = localFont({
  src: './fonts/GeistMono[wght].woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='pt-BR'
      suppressHydrationWarning
      className={cn(inter.variable, geistMono.variable, 'antialiased')}
    >
      <body className='bg-bg-white-0 text-text-strong-950'>
        <ThemeProvider attribute='class'>
          <QueryProvider>
            <AuthProvider>
              <ThemeColorProvider />
              <TooltipProvider>
                {children}
                <GlobalCommandMenu />
              </TooltipProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
        <NotificationProvider />
      </body>
    </html>
  );
}
