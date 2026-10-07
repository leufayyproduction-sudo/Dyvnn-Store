import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import './globals.css';
import '@/components/game-card.css';
import VisitTracker from '@/components/VisitTracker';

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title: { default: 'Your next level starts here', template: '%s | Dyvnn Store' },
  description: 'Top Up Your Favorite Games. Temukan Mobile Legends, PUBG Mobile, Free Fire, dan game favoritmu di Dyvnn Store.',
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    siteName: 'Dyvnn Store',
    title: 'Dyvnn Store',
    description: 'Top up game favoritmu dengan cepat dan aman di Dyvnn Store.',
  },
};

export const viewport: Viewport = { themeColor: '#080812' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}<VisitTracker /></body></html>;
}
