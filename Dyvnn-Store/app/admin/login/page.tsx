'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Gamepad2, LockKeyhole } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BrandLogo from '@/components/BrandLogo';
import { getErrorMessage } from '@/lib/errors';
import styles from '../admin.module.css';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const { data: admin, error: adminError } = await supabase.from('admins').select('user_id').maybeSingle();
      if (adminError || !admin) {
        await supabase.auth.signOut();
        throw new Error('Akun ini belum terdaftar sebagai admin Dyvnn Store.');
      }
      router.replace('/admin');
      router.refresh();
    } catch (cause) {
      setError(getErrorMessage(cause) || 'Login gagal. Periksa kembali data akun.');
    } finally { setBusy(false); }
  }

  return <main className={styles.loginPage}>
    <header className={styles.loginTopbar}><BrandLogo className={styles.loginBrand}/><Link href="/" className={styles.loginBack}><ArrowLeft size={15}/> Kembali</Link></header>
    <form className={styles.loginCard} onSubmit={submit}>
      <span className={styles.loginIcon}><Gamepad2 size={23}/></span>
      <span className={styles.eyebrow}>DYVNN STORE / ADMIN</span>
      <h1>Welcome back.</h1>
      <p>Masuk untuk mengelola toko dan pesanan.</p>
      <label htmlFor="admin-email">Email</label>
      <input id="admin-email" type="email" autoComplete="username" required value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="admin@dyvnn.store" />
      <label htmlFor="admin-password">Password</label>
      <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event)=>setPassword(event.target.value)} placeholder="••••••••" />
      {error && <span role="alert" className={styles.loginError}>{error}</span>}
      <button disabled={busy}><LockKeyhole size={15}/>{busy ? 'Memeriksa…' : 'Masuk ke dashboard'}</button>
      <small>Akses admin diberikan melalui Supabase Auth dan tabel admins.</small>
    </form>
  </main>;
}
