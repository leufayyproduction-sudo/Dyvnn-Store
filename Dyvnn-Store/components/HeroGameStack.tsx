'use client';
import { motion, useReducedMotion } from 'framer-motion';
import Image from 'next/image';
import { ArrowDown, ArrowUpRight, BadgeCheck, Gamepad2, Sparkles, Star, Zap } from 'lucide-react';
import { games, type Game } from '@/lib/games';

const stack = [games[2], games[1], games[0], games[3], games[4]];
export default function HeroGameStack({ onSelect }: { onSelect: (game: Game) => void }) {
  const reduce = useReducedMotion();
  return <section className="hero" aria-labelledby="hero-heading">
    <div className="hero-grid"/><div className="hero-orb orb-one"/><div className="hero-orb orb-two"/>
    <div className="hero-corner"><span><i/> THE GOOD GAME STARTS HERE</span><Gamepad2 size={19}/></div>
    <div className="hero-copy"><div className="eyebrow-pill"><Sparkles size={13}/> A little top up. A whole new level.</div><h1 id="hero-heading"><span className="hero-title-lines">Top Up Your<br/><span>Favorite Games</span></span><span className="headline-star" aria-hidden="true">✦</span></h1><p>Fast, Secure and Affordable Game Top Up</p><a className="primary-button" href="#games">Explore Games <ArrowUpRight size={17}/></a><div className="hero-reassurance"><span><Zap size={15}/> Instant top up</span><span className="tiny-dot"/><span><BadgeCheck size={15}/> Play with confidence</span></div></div>
    <div className="floating-label label-left"><Zap size={15}/><div>Less waiting.<br/><strong>More playing.</strong></div></div><div className="floating-label label-right"><span className="diamond-symbol">◇</span><div>A boost for your<br/><strong>next adventure.</strong></div></div>
    <div className="game-stack" aria-label="Featured games">{stack.map((game, index) => <div key={game.id} className={`stack-position stack-${index}`}><motion.button className={`hero-game hero-game-${game.id}`} onClick={() => onSelect(game)} style={{ '--game-color': game.color } as React.CSSProperties} animate={reduce ? {} : { y: [0, -9, 0] }} transition={{ duration: 5 + index * .45, repeat: Infinity, ease: 'easeInOut', delay: index * .3 }} whileHover={reduce ? {} : { y: -20, scale: 1.035 }} aria-label={`View ${game.name}`}>
      <div className="hero-game-top"><div><h2>{game.shortName}</h2><span>{game.category}</span></div><span className="game-rating"><Star size={10} fill="currentColor"/>{game.rating}</span></div><div className="hero-art"><Image src={game.image} alt="" fill sizes="(max-width: 640px) 180px, 320px" priority={index === 2}/></div><div className="hero-game-bottom"><span><i className={game.available ? 'status-dot' : 'status-dot soon'}/>{game.available ? 'Ready to top up' : 'Coming soon'}</span><ArrowUpRight size={17}/></div>{index === 2 && <span className="popular-tag"><Zap size={11} fill="currentColor"/> PLAYER FAVORITE</span>}
    </motion.button></div>)}</div>
    <div className="hero-bottom"><span>FIND YOUR GAME. MAKE IT YOURS.</span><a href="#games" aria-label="Scroll to games"><ArrowDown size={16}/></a><span>01 <span className="slide-line"/> 05</span></div>
  </section>;
}
