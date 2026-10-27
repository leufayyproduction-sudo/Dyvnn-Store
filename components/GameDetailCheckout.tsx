'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronRight, CircleHelp, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
import { z } from 'zod';
import type { Game } from '@/lib/games';
import styles from '@/app/games/[slug]/game-detail.module.css';

export type TopUpProduct = { id: string; label: string; price: number; bonus?: string };

function createCheckoutSchema(requiresServer: boolean) {
  return z.object({
  userId: z.string().trim().regex(/^\d{5,15}$/, 'User ID harus 5–15 digit angka.'),
  serverId: z.string().trim().regex(/^(?:\d{1,6})?$/, 'Server ID harus 1–6 digit angka.'),
  customerName: z.string().trim().max(80, 'Nama maksimal 80 karakter.'),
}).superRefine((values, context) => {
  if (requiresServer && values.serverId.length === 0) context.addIssue({ code: 'custom', path: ['serverId'], message: 'Server ID wajib diisi untuk Mobile Legends.' });
});
}

export default function GameDetailCheckout({
  game,
  products,
  accent,
}: {
  game: Game;
  products: TopUpProduct[];
  accent: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [serverId, setServerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ userId?: string; serverId?: string; customerName?: string }>({});
  const [message, setMessage] = useState('');
  const [liveProducts, setLiveProducts] = useState<TopUpProduct[]>(products);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const router = useRouter();
  const chosenProduct = liveProducts.find((product) => product.id === selected);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/games/${game.id}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Katalog Supabase belum tersedia.');
        if (!cancelled) {
          setLiveProducts((result.products ?? []).map((product: { id: string; name: string; price_idr: number; bonus: string | null }) => ({
            id: product.id, label: product.name, price: product.price_idr, bonus: product.bonus ?? undefined,
          })));
          setCatalogReady(true);
        }
      })
      .catch((error: unknown) => { if (!cancelled) setCatalogError(error instanceof Error ? error.message : 'Katalog belum tersedia.'); });
    return () => { cancelled = true; };
  }, [game.id]);

  async function handleContinue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validation = createCheckoutSchema(game.id === 'mlbb').safeParse({ userId, serverId, customerName });
    if (!validation.success) {
      const nextErrors: typeof fieldErrors = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === 'userId' || issue.path[0] === 'serverId' || issue.path[0] === 'customerName') nextErrors[issue.path[0]] = issue.message;
      }
      setFieldErrors(nextErrors);
      setMessage('Periksa kembali data akun game.');
      return;
    }
    setFieldErrors({});
    if (!chosenProduct) {
      setMessage('Pilih nominal top up terlebih dahulu.');
      return;
    }
    if (!userId.trim()) {
      setMessage('Masukkan User ID untuk melanjutkan.');
      document.getElementById('game-user-id')?.focus();
      return;
    }

    if (!catalogReady) {
      setMessage('Katalog Supabase belum siap. Periksa konfigurasi database.');
      return;
    }
    setMessage('Membuat order…');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: chosenProduct.id, userGameId: validation.data.userId, serverId: validation.data.serverId, customerName: validation.data.customerName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Order gagal dibuat.');
      router.push(`/orders/${result.order.id}?token=${result.order.public_token}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Order gagal dibuat.');
    }
  }

  return (
    <div className={styles.mainGrid} style={{ '--game-accent': accent } as React.CSSProperties}>
      <section className={styles.products} aria-labelledby="products-heading">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>PILIH PRODUK</span>
            <h2 id="products-heading">Paket {game.currency}</h2>
          </div>
          <span className={styles.productCount}>{liveProducts.length} pilihan</span>
        </div>

        <div className={styles.productList}>
          {liveProducts.map((product) => {
            const isSelected = selected === product.id;
            return (
              <button
                key={product.id}
                type="button"
                className={`${styles.productCard} ${isSelected ? styles.productSelected : ''}`}
                onClick={() => { setSelected(product.id); setMessage(''); }}
                aria-pressed={isSelected}
              >
                <span className={styles.productGem} aria-hidden="true"><Sparkles size={19} /></span>
                <span className={styles.productInfo}>
                  <strong>{product.label}</strong>
                  {product.bonus && <small>{product.bonus}</small>}
                </span>
                <span className={styles.productPrice}>Rp{product.price.toLocaleString('id-ID')}</span>
                {isSelected && <span className={styles.selectedCheck}><Check size={13} /></span>}
              </button>
            );
          })}
        </div>
        <p className={styles.catalogNote}><CircleHelp size={14} /> {catalogReady ? 'Harga terhubung ke katalog Supabase.' : catalogError || 'Memuat katalog…'}</p>
      </section>

      <aside className={styles.checkout} aria-labelledby="checkout-heading">
        <div className={styles.checkoutTop}>
          <span className={styles.checkoutIcon}><CreditCard size={19} /></span>
          <div><span className={styles.eyebrow}>LANGKAH BERIKUTNYA</span><h2 id="checkout-heading">Detail akun</h2></div>
        </div>
        <p className={styles.checkoutIntro}>Pastikan ID game kamu benar agar item masuk ke akun yang tepat.</p>

        <form onSubmit={handleContinue} noValidate>
          <label className={styles.fieldLabel} htmlFor="game-user-id">User ID <span>Wajib</span></label>
          <input id="game-user-id" className={styles.field} inputMode="numeric" autoComplete="off" maxLength={15} placeholder="Masukkan User ID" value={userId} aria-invalid={!!fieldErrors.userId} onChange={(event) => { setUserId(event.target.value); setFieldErrors((current)=>({...current,userId:undefined})); setMessage(''); }} />
          {fieldErrors.userId&&<p className={styles.errorMessage}>{fieldErrors.userId}</p>}
          <label className={styles.fieldLabel} htmlFor="game-server-id">Server ID <span>{game.id==='mlbb'?'Wajib untuk Mobile Legends':'Opsional'}</span></label>
          <input id="game-server-id" className={styles.field} inputMode="numeric" autoComplete="off" maxLength={6} placeholder="Masukkan Server ID" value={serverId} aria-invalid={!!fieldErrors.serverId} onChange={(event) => { setServerId(event.target.value); setFieldErrors((current)=>({...current,serverId:undefined})); setMessage(''); }} />
          {fieldErrors.serverId&&<p className={styles.errorMessage}>{fieldErrors.serverId}</p>}
          <label className={styles.fieldLabel} htmlFor="customer-name">Nama <span>Opsional</span></label>
          <input id="customer-name" className={styles.field} autoComplete="name" maxLength={80} placeholder="Nama pemesan" value={customerName} aria-invalid={!!fieldErrors.customerName} onChange={(event) => { setCustomerName(event.target.value); setFieldErrors((current)=>({...current,customerName:undefined})); setMessage(''); }} />
          {fieldErrors.customerName&&<p className={styles.errorMessage}>{fieldErrors.customerName}</p>}
          <p className={styles.fieldHint}><CircleHelp size={13} /> ID dapat ditemukan pada halaman profil game.</p>

          {chosenProduct && <div className={styles.orderSummary}><span>{chosenProduct.label}</span><strong>Rp{chosenProduct.price.toLocaleString('id-ID')}</strong></div>}
          {message && <p className={message.startsWith('Preview') ? styles.successMessage : styles.errorMessage} role="status">{message}</p>}
          <button className={styles.continueButton} type="submit" disabled={!catalogReady}>Continue Payment <ChevronRight size={16} /></button>
        </form>
        <div className={styles.secureNote}><ShieldCheck size={15} /><span>Data akun hanya digunakan untuk menyiapkan pesanan.</span></div>
      </aside>
    </div>
  );
}
