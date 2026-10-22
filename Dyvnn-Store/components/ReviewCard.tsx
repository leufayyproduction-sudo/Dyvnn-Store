import { BadgeCheck, Star } from 'lucide-react';
export default function ReviewCard({ name, game, comment, initials, color, rating = 5 }: { name: string; game: string; comment: string; initials: string; color: string; rating?: number }) {
  return <article className="review-card"><div className="review-top"><span className="stars" aria-label={`${rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} fill={i < rating ? 'currentColor' : 'none'}/>)}</span><span className="review-quote" aria-hidden="true">“</span></div><p>“{comment}”</p><div className="review-person"><span className="avatar" style={{ background: color }}>{initials}</span><div><strong>{name} <BadgeCheck size={12}/></strong><span>{game} player</span></div></div></article>;
}
