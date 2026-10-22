'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Clock3, Star, Zap } from 'lucide-react';
import type { Game } from '@/lib/games';
export default function GameCard({ game }: { game: Game }) {
  return <article className="store-card" style={{ '--game-color': game.color } as React.CSSProperties}>
    <div className="store-art"><Image src={game.image} alt={`${game.name} game artwork`} fill sizes="(max-width: 600px) 45vw, (max-width: 1000px) 30vw, 240px"/><span className="category-badge">{game.category}</span>{game.id === 'mlbb' && <span className="hot-badge"><Zap size={10} fill="currentColor"/> HOT</span>}</div>
    <div className="store-card-body"><div className="publisher">{game.publisher}</div><h3><Link href={`/games/${game.id}`}>{game.name}</Link></h3><div className="card-meta"><span className={game.available ? 'available' : 'coming'}><i/>{game.available ? 'Available' : 'Coming Soon'}</span><span className="muted-rating"><Star size={11} fill="currentColor"/>{game.rating}</span></div><div className="card-rule"/>{game.available ? <div className="price-row"><span>Mulai dari<strong>Rp {game.price}</strong></span><Link className="game-topup-link" href={`/games/${game.id}`}>Top Up <ArrowUpRight size={14}/></Link></div> : <Link className="coming-button" href={`/games/${game.id}`}><Clock3 size={13}/> Coming Soon</Link>}</div>
  </article>;
}
