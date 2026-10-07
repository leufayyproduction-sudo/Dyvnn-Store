import { ArrowUpRight, type LucideIcon } from 'lucide-react';
export default function FeatureCard({ icon: Icon, title, description, color }: { icon: LucideIcon; title: string; description: string; color: string }) {
  return <article className="feature-card" style={{ '--feature-color': color } as React.CSSProperties}><span className="feature-icon"><Icon size={21}/></span><div><h3>{title}</h3><p>{description}</p></div><ArrowUpRight className="feature-arrow" size={17}/></article>;
}
