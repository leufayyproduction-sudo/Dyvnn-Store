'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Gamepad2, X } from 'lucide-react';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import type { Game } from '@/lib/games';

const emailSchema = z.string().trim().email('Masukkan alamat email yang valid.');
const authSchema = z.object({ email: emailSchema, password: z.string().min(8, 'Password minimal 8 karakter.') });
const registerSchema = authSchema.extend({ confirm: z.string() })
  .refine((value) => value.password === value.confirm, { path: ['confirm'], message: 'Konfirmasi password belum sama.' });
type Mode = 'login' | 'signup' | 'forgot';
type FieldErrors = { email?: string; password?: string; confirm?: string };

export default function StoreModal({ game, login, nextPath = '/', onClose, onAuthenticated }: {
  game: Game | null; login: boolean; nextPath?: string; onClose: () => void; onAuthenticated: (next: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = dialog.current; const previous = document.activeElement as HTMLElement;
    el?.showModal(); return () => { el?.close(); previous?.focus(); };
  }, []);

  function changeMode(value: Mode) { setMode(value); setErrors({}); setMessage(''); setDone(false); }
  async function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setErrors({}); setMessage('');
    if (mode === 'forgot') {
      const parsed = emailSchema.safeParse(email);
      if (!parsed.success) { setErrors({ email: parsed.error.issues[0]?.message }); return; }
      setLoading(true);
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/reset-password')}`;
      const { error } = await createClient().auth.resetPasswordForEmail(parsed.data, { redirectTo });
      setLoading(false); setDone(!error);
      setMessage(error ? 'Permintaan belum dapat diproses. Coba lagi nanti.' : 'Jika email tersebut terdaftar, tautan pemulihan akan dikirim. Periksa kotak masukmu.');
      return;
    }
    const parsed = mode === 'signup' ? registerSchema.safeParse({ email, password, confirm }) : authSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) if (['email','password','confirm'].includes(String(issue.path[0]))) fieldErrors[issue.path[0] as keyof FieldErrors] = issue.message;
      setErrors(fieldErrors); return;
    }
    setLoading(true);
    const supabase = createClient();
    if (mode === 'login') {
      const result = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
      setLoading(false);
      if (result.error) { setMessage('Email atau password salah.'); return; }
      onAuthenticated(nextPath);
      return;
    }
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
    const result = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { emailRedirectTo: redirectTo } });
    setLoading(false);
    if (result.error) { setMessage('Pendaftaran belum dapat diproses. Periksa data atau coba lagi nanti.'); return; }
    if (result.data.session) onAuthenticated(nextPath);
    else { setDone(true); setMessage('Jika pendaftaran berhasil, tautan verifikasi akan dikirim ke emailmu. Periksa kotak masuk.'); }
  }

  const title = mode === 'forgot' ? 'Atur ulang password.' : mode === 'signup' ? 'Buat akun pemain.' : 'Welcome, Player.';
  return <dialog ref={dialog} className="store-dialog" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="dialog-title"><div className="dialog-content">
    <button className="dialog-close icon-button" onClick={onClose} aria-label="Tutup dialog"><X size={20}/></button><span className="dialog-icon"><Gamepad2/></span><span className="section-eyebrow">DYVNN STORE / AKUN</span><h2 id="dialog-title">{login ? title : game?.name}</h2>
    {login ? <>
      <p>{mode === 'forgot' ? 'Kami akan mengirim tautan pemulihan jika email terdaftar.' : 'Akun Dyvnn kamu, satu tempat untuk semua game favorit.'}</p>
      {mode !== 'forgot' && <div className="auth-tabs" role="tablist" aria-label="Metode akun"><button type="button" role="tab" aria-selected={mode==='login'} className={mode==='login'?'active':''} onClick={()=>changeMode('login')}>Masuk</button><button type="button" role="tab" aria-selected={mode==='signup'} className={mode==='signup'?'active':''} onClick={()=>changeMode('signup')}>Daftar</button></div>}
      {mode === 'forgot' && <button type="button" className="auth-link" onClick={()=>changeMode('login')}>← Kembali ke Masuk</button>}
      <form className="auth-form" onSubmit={submitAuth} noValidate>
        <label className="auth-label" htmlFor="auth-email">Email</label><input className="auth-input" id="auth-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="nama@email.com" aria-invalid={!!errors.email}/>{errors.email&&<small className="auth-field-error">{errors.email}</small>}
        {mode !== 'forgot' && <><label className="auth-label" htmlFor="auth-password">Password</label><div className="auth-password"><input id="auth-password" type={visible?'text':'password'} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 8 karakter" aria-invalid={!!errors.password}/><button type="button" onClick={()=>setVisible(!visible)} aria-label={visible?'Sembunyikan password':'Lihat password'}>{visible?<EyeOff size={16}/>:<Eye size={16}/>}</button></div>{errors.password&&<small className="auth-field-error">{errors.password}</small>}</>}
        {mode === 'signup' && <><label className="auth-label" htmlFor="auth-confirm">Konfirmasi password</label><div className="auth-password"><input id="auth-confirm" type={visible?'text':'password'} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Ulangi password" aria-invalid={!!errors.confirm}/><button type="button" onClick={()=>setVisible(!visible)} aria-label={visible?'Sembunyikan password':'Lihat password'}>{visible?<EyeOff size={16}/>:<Eye size={16}/>}</button></div>{errors.confirm&&<small className="auth-field-error">{errors.confirm}</small>}</>}
        {mode === 'login' && <button type="button" className="auth-link" onClick={()=>changeMode('forgot')}>Lupa password?</button>}
        {message&&<p className="auth-feedback" role="status">{message}</p>}
        <button className="primary-button full-width auth-submit" disabled={loading||done}>{loading?'Memproses…':mode==='forgot'?'Kirim tautan pemulihan':mode==='signup'?'Buat akun':'Masuk'} <ArrowRight size={15}/></button>
      </form>
    </> : <><p>Something good is on the way.</p><div className="preview-note">Top up {game?.name} segera hadir. Sambil menunggu, temukan game lain yang sudah tersedia di katalog.</div><button className="primary-button full-width" onClick={onClose}>Lihat game lainnya <ArrowRight size={16}/></button></>}
  </div></dialog>;
}
