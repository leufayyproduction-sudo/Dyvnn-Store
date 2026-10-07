import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye, Flame, Star } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import GameDetailCheckout, { type TopUpProduct } from '@/components/GameDetailCheckout';
import { games } from '@/lib/games';
import styles from './game-detail.module.css';

const themes: Record<string, { accent: string; secondary: string; orders: string; views: string; products: TopUpProduct[] }> = {
  mlbb: {
    accent: '#a78bfa', secondary: '#fb923c', orders: '50.699+', views: '336.657',
    products: [
      { id: 'ml-50', label: '50 Diamonds', price: 15000 },
      { id: 'ml-100', label: '100 Diamonds', price: 28000, bonus: 'Pilihan populer' },
      { id: 'ml-250', label: '250 Diamonds', price: 70000 },
    ],
  },
  pubg: {
    accent: '#38bdf8', secondary: '#93c5fd', orders: '18.420+', views: '128.904',
    products: [
      { id: 'pubg-60', label: '60 UC', price: 16000 },
      { id: 'pubg-325', label: '325 UC', price: 79000, bonus: 'Pilihan populer' },
      { id: 'pubg-660', label: '660 UC', price: 158000 },
    ],
  },
  ff: {
    accent: '#fb923c', secondary: '#facc15', orders: '24.810+', views: '192.530',
    products: [
      { id: 'ff-70', label: '70 Diamonds', price: 10000 },
      { id: 'ff-140', label: '140 Diamonds', price: 20000, bonus: 'Pilihan populer' },
      { id: 'ff-355', label: '355 Diamonds', price: 50000 },
    ],
  },
  hok: {
    accent: '#c084fc', secondary: '#fb7185', orders: '6.218+', views: '48.306',
    products: [
      { id: 'hok-80', label: '80 Tokens', price: 15000 },
      { id: 'hok-240', label: '240 Tokens', price: 45000, bonus: 'Pilihan populer' },
      { id: 'hok-400', label: '400 Tokens', price: 75000 },
    ],
  },
  roblox: {
    accent: '#e5e7eb', secondary: '#9ca3af', orders: '9.730+', views: '74.210',
    products: [
      { id: 'rbx-80', label: '80 Robux', price: 16000 },
      { id: 'rbx-400', label: '400 Robux', price: 79000, bonus: 'Pilihan populer' },
      { id: 'rbx-800', label: '800 Robux', price: 149000 },
    ],
  },
};

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = games.find((item) => item.id === slug);
  return game
    ? { title: `${game.name} Top Up`, description: `Top up ${game.name} di Dyvnn Store.` }
    : { title: 'Game tidak ditemukan' };
}

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.id }));
}

export default async function GameDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const game = games.find((item) => item.id === slug);
  if (!game) notFound();

  const theme = themes[game.id] ?? themes.mlbb;
  const styleVars = {
    '--game-accent': theme.accent,
    '--game-secondary': theme.secondary,
  } as React.CSSProperties;

  return (
    <main className={styles.page} style={styleVars}>
      <header className={styles.topbar}>
        <BrandLogo className={styles.storeLogo} />
        <Link href="/#games" className={styles.backLink}><ArrowLeft size={15} /> Semua game</Link>
      </header>

      <section className={styles.banner} aria-labelledby="game-title">
        <Image src={game.image} alt="" fill priority sizes="100vw" className={styles.bannerImage} />
        <div className={styles.bannerScrim} />
        <div className={styles.bannerContent}>
          <span className={styles.gameCategory}>{game.publisher} <i /> {game.category}</span>
          <h1 id="game-title">{game.name}<span>{game.id === 'mlbb' ? ' ID' : ' Top Up'}</span></h1>
          <p>Top Up {game.currency} {game.shortName === 'Mobile Legends' ? 'ML' : game.shortName} dengan harga murah dan proses cepat.</p>
          <div className={styles.stats} aria-label="Statistik game">
            <div className={styles.stat}><span className={styles.statIcon} style={{ background: `${theme.secondary}22`, color: theme.secondary }}><Flame size={16} /></span><span><strong>{theme.orders}</strong><small>Total orders</small></span></div>
            <div className={styles.stat}><span className={styles.statIcon} style={{ background: `${theme.accent}22`, color: theme.accent }}><Eye size={16} /></span><span><strong>{theme.views}</strong><small>Views</small></span></div>
            <div className={styles.stat}><span className={styles.statIcon} style={{ background: '#facc1520', color: '#facc15' }}><Star size={16} fill="currentColor" /></span><span><strong>{game.rating}<small className={styles.outOf}> / 5</small></strong><small>Player rating</small></span></div>
          </div>
          <small className={styles.previewData}>Statistik contoh untuk preview UI</small>
        </div>
        <span className={styles.bannerOrb} aria-hidden="true" />
      </section>

      <GameDetailCheckout game={game} products={theme.products} accent={theme.accent} />
      <footer className={styles.footer}><span>© {new Date().getFullYear()} Dyvnn Store</span><span>Game top up, made simple.</span></footer>
    </main>
  );
}
