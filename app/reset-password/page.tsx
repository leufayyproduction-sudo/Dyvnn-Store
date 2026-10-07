'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Gamepad2 } from 'lucide-react';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import BrandLogo from '@/components/BrandLogo';

const passwordSchema = z.object({ password: z.string().min(8, 'Password minimal 8 karakter.'), confirm: z.string() })
  .refine((value) => value.password === value.confirm, { path: ['confirm'], message: 'Konfirmasi password belum sama.' });

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage('');
    const parsed = passwordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      const fields: typeof errors = {};
      for (const issue of parsed.error.issues) if (issue.path[0] === 'password' || issue.path[0] === 'confirm') fields[issue.path[0]] = issue.message;
      setErrors(fields); return;
    }
    setErrors({}); setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) { setMessage('Tautan pemulihan tidak valid atau sudah kedaluwarsa. Minta tautan baru.'); return; }
    setMessage('Password berhasil diperbarui. Silakan masuk kembali.');
    window.setTimeout(() => router.replace('/'), 1200);
  }

  return <main className="auth-page"><nav className="account-topbar"><BrandLogo/><Link href="/" className="account-back"><span aria-hidden="true">←</span> Kembali</Link></nav><form className="auth-card" onSubmit={submit}>
    <span className="auth-icon"><Gamepad2 size={22}/></span><span className="section-eyebrow">DYVNN STORE / AKUN</span><h1>Buat password baru</h1><p>Gunakan password baru untuk mengamankan akunmu.</p>
    <label className="auth-label" htmlFor="new-password">Password baru</label><div className="auth-password"><input id="new-password" type={visible?'text':'password'} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} aria-invalid={!!errors.password}/><button type="button" onClick={()=>setVisible(!visible)} aria-label={visible?'Sembunyikan password':'Lihat password'}>{visible?<EyeOff size={16}/>:<Eye size={16}/>}</button></div>{errors.password&&<small className="auth-field-error">{errors.password}</small>}
    <label className="auth-label" htmlFor="confirm-password">Konfirmasi password</label><input className="auth-input" id="confirm-password" type={visible?'text':'password'} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} aria-invalid={!!errors.confirm}/>{errors.confirm&&<small className="auth-field-error">{errors.confirm}</small>}
    {message&&<p className="auth-feedback" role="status">{message}</p>}<button className="primary-button full-width auth-submit" disabled={loading}>{loading?'Menyimpan…':'Simpan password'}</button>
  </form></main>;
}
