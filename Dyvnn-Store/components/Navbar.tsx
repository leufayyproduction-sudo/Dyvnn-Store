'use client';
import { ArrowUpRight, ChevronDown, LogOut, Menu, Package, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import BrandLogo from '@/components/BrandLogo';

export default function Navbar({ onLogin }: { onLogin: () => void }) {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string; user_metadata?: Record<string, unknown> } | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);
  const name = String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'Akun');
  const initials = name.split(/[\s._-]+/).filter(Boolean).slice(0,2).map(part=>part[0]?.toUpperCase()).join('') || 'A';
  async function signOut() { await createClient().auth.signOut(); setAccountOpen(false); router.refresh(); }
  return <header className="navbar"><div className="nav-inner">
    <div className="brand-lockup"><BrandLogo className="home-brand" priority/><span className="brand-divider"/><span className="brand-caption">YOUR GAME.<br/><b>YOUR NEXT LEVEL.</b></span></div>
    <nav aria-label="Main navigation" className={open ? 'nav-links open' : 'nav-links'}>{[['Games', '#games'], ['Top Up', '#games'], ['Reviews', '#reviews'], ['Support', '#support']].map(([label, href], i) => <a key={label} href={href} className={i === 0 ? 'active' : ''} onClick={() => setOpen(false)}>{label}</a>)}</nav>
    <div className="nav-actions"><span className="nav-online"><i/> All systems ready</span>{user?<div className="nav-account"><button className="login-button account-trigger" aria-expanded={accountOpen} onClick={()=>setAccountOpen(!accountOpen)}><span className="account-initials">{initials}</span><span className="account-name">{name}</span><ChevronDown size={14}/></button>{accountOpen&&<div className="account-menu"><a href="/akun/pesanan" onClick={()=>setAccountOpen(false)}><Package size={15}/> Pesanan Saya</a><button onClick={signOut}><LogOut size={15}/> Keluar</button></div>}</div>:<button className="login-button" onClick={onLogin}>Login <ArrowUpRight size={15}/></button>}<button className="mobile-menu icon-button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div>
  </div></header>;
}
