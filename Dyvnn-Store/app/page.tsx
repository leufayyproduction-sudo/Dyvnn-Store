'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Gamepad2, Headphones, Search, ShieldCheck, SlidersHorizontal, Sparkles, Star, X, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import HeroGameStack from '@/components/HeroGameStack';
import GameCard from '@/components/GameCard';
import FeatureCard from '@/components/FeatureCard';
import ReviewCard from '@/components/ReviewCard';
import WhatsappBubble from '@/components/WhatsappBubble';
import StoreModal from '@/components/StoreModal';
import BrandLogo from '@/components/BrandLogo';
import { games, type Game } from '@/lib/games';

type PublicReview = { id: string; display_name: string; rating: number; comment: string; games: { name: string } | { name: string }[] | null };

export default function Home() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All Games');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [login, setLogin] = useState(false);
  const [loginNext, setLoginNext] = useState('/');
  const router = useRouter();
  const [catalogGames, setCatalogGames] = useState<Game[]>(games);
  const [catalogConnected, setCatalogConnected] = useState(false);
  const [publishedReviews, setPublishedReviews] = useState<PublicReview[] | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === '1') {
      const next = params.get('next') ?? '/';
      setLoginNext(next.startsWith('/') && !next.startsWith('//') ? next : '/');
      setLogin(true);
    }
  }, []);
  function finishLogin(next: string) {
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
    setLogin(false); router.replace(safeNext); router.refresh();
  }
  useEffect(() => {
    let cancelled = false;
    fetch('/api/reviews', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Review feed unavailable');
      const result = await response.json();
      if (!cancelled) setPublishedReviews(result.reviews ?? []);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/games', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Catalog unavailable');
      const result = await response.json();
      if (!cancelled && result.games?.length) { setCatalogGames(result.games); setCatalogConnected(true); }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const filtered = useMemo(() => catalogGames.filter(game => game.name.toLowerCase().includes(query.toLowerCase()) && (category === 'All Games' || game.category === category) && (!availableOnly || game.available)), [catalogGames, query, category, availableOnly]);
  return <>
    <a className="skip-link" href="#main">Skip to content</a><Navbar onLogin={() => setLogin(true)}/>
    <main id="main" className="page-shell">
      <HeroGameStack onSelect={game => router.push(`/games/${game.id}`)}/>
      <div className="trust-strip"><span><ShieldCheck size={15}/> Safe & secure</span><i/><span><Zap size={15}/> Made for instant wins</span><i/><span><Headphones size={15}/> Always here for you</span><div className="trust-signature">A better way to <strong>play.</strong><Sparkles size={14}/></div></div>
      <section id="games" className="games-section" aria-labelledby="games-heading"><div className="section-heading"><div><span className="section-eyebrow"><span/> THE GAME ROOM</span><h2 id="games-heading">Pick your next <span>adventure.</span></h2><p>Game favoritmu, tinggal satu top up lagi.</p></div><span className="section-count"><Gamepad2 size={16}/> 5 games. Endless possibilities.</span></div>
        <div className="catalog-toolbar"><div className="category-tabs" aria-label="Game categories">{['All Games', 'MOBA', 'Battle Royale', 'Adventure'].map(tab => <button key={tab} className={category === tab ? 'selected' : ''} onClick={() => setCategory(tab)} aria-pressed={category === tab}>{tab === 'All Games' && <Gamepad2 size={14}/>} {tab}{tab === 'All Games' && <span>5</span>}</button>)}</div><div className="catalog-search"><label className="search-field"><Search size={15}/><input aria-label="Search games" placeholder="Find your game…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={13}/></button>}</label><button className={`filter-button ${availableOnly ? 'selected' : ''}`} aria-label="Show available games only" title="Show available games only" aria-pressed={availableOnly} onClick={() => setAvailableOnly(!availableOnly)}><SlidersHorizontal size={16}/></button></div></div>
        <div className="game-catalog">{filtered.map(game => <GameCard key={game.id} game={game}/>)}</div>{!filtered.length && <div className="empty-state"><Search size={28}/><h3>Game belum ditemukan</h3><p>Coba kata kunci lain atau tampilkan semua game.</p><button className="primary-button" onClick={() => { setQuery(''); setCategory('All Games'); setAvailableOnly(false); }}>Reset pencarian</button></div>}<div className="catalog-footnote"><span><i/> {filtered.filter(g => g.available).length} game siap menemani kamu</span><span>{catalogConnected ? 'Harga live dari Supabase' : 'Katalog preview · Supabase belum terhubung'} <ArrowUpRight size={12}/></span></div>
      </section>
      <section className="features-section" id="support" aria-label="Why Dyvnn Store"><FeatureCard icon={Zap} title="Instant Delivery" description="Top up masuk. Langsung gas main." color="#b79aff"/><FeatureCard icon={ShieldCheck} title="Secure Payment" description="Nyaman di setiap langkah transaksi." color="#6ed3fc"/><FeatureCard icon={Headphones} title="24/7 Support" description="Ada kendala? Kami siap membantu." color="#f6a0cd"/></section>
      <section id="reviews" className="reviews-section" aria-labelledby="reviews-heading"><div className="section-heading"><div><span className="section-eyebrow"><span/> PLAYER STORIES</span><h2 id="reviews-heading">Good games. <span>Happy players.</span></h2><p>Little top ups, big smiles.</p></div><div className="review-overview"><div><Star size={18} fill="currentColor"/><strong>{publishedReviews?.length ? (publishedReviews.reduce((sum, review) => sum + review.rating, 0) / publishedReviews.length).toFixed(1) : publishedReviews ? '—' : '5.0'}</strong><span>{publishedReviews?.length ? `· ${publishedReviews.length}` : '/ 5'}</span></div><span>{publishedReviews === null ? 'Contoh ulasan · UI preview' : 'Ulasan terverifikasi'}</span></div></div><div className="review-grid">{publishedReviews === null ? <><ReviewCard name="Rizky A." initials="RA" game="Mobile Legends" color="#514079" comment="Sat set banget! Diamond langsung masuk, tinggal lanjut push rank bareng squad. Desainnya juga enak dilihat."/><ReviewCard name="Nadia P." initials="NP" game="PUBG Mobile" color="#305570" comment="Top up UC jadi gampang. Pilih nominal, beres! Bakal jadi tempat langganan kalau mau isi lagi."/><ReviewCard name="Fajar R." initials="FR" game="Free Fire" color="#704561" comment="Harganya pas di kantong, prosesnya simpel. Akhirnya bisa dapetin skin yang udah lama diincer!"/></> : publishedReviews.length ? publishedReviews.map((review, index) => { const game = Array.isArray(review.games) ? review.games[0]?.name : review.games?.name; return <ReviewCard key={review.id} name={review.display_name} initials={review.display_name.split(/\s+/).map(part => part[0]).join('').slice(0,2).toUpperCase()} game={game ?? 'Dyvnn player'} color={['#514079','#305570','#704561'][index % 3]} comment={review.comment} rating={review.rating}/>; }) : <div className="empty-state"><Star size={24}/><h3>Belum ada ulasan terpublikasi</h3><p>Review pemain akan tampil di sini setelah moderasi.</p></div>}</div></section>
      <section className="closing-banner"><div className="closing-icon"><Gamepad2 size={28}/></div><div><span>READY WHEN YOU ARE.</span><h2>Your next level starts here.</h2></div><a href="#games" className="primary-button">Let’s play <ArrowUpRight size={16}/></a><span className="closing-sparkle" aria-hidden="true">✦</span></section>
      <footer><div className="footer-main"><div className="footer-brand"><BrandLogo className="footer-brand-logo"/><span>A little boost for every player.</span></div><div><a href="#games">Games</a><a href="#reviews">Reviews</a><a href="#support">Support <ArrowUpRight size={12}/></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Dyvnn Store. Made for your next level.</span><span>Frontend preview <i/> Crafted with a little magic <Sparkles size={12}/></span></div></footer>
    </main><WhatsappBubble/>{login && <StoreModal game={null} login={login} nextPath={loginNext} onClose={() => setLogin(false)} onAuthenticated={finishLogin}/>} 
  </>;
}
