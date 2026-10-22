import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import BrandLogo from '@/components/BrandLogo';

const statusLabels: Record<string, string> = {
  pending_payment: 'Menunggu pembayaran', proof_submitted: 'Bukti sedang diverifikasi', paid: 'Dibayar',
  processing: 'Diproses', completed: 'Selesai', rejected: 'Ditolak', cancelled: 'Dibatalkan',
};
const money = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export const dynamic = 'force-dynamic';

export default async function MyOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/?login=1&next=%2Fakun%2Fpesanan');

  const { data: orders, error } = await supabase.from('orders')
    .select('id,order_number,public_token,game_name,product_name,price_idr,status,created_at')
    .eq('user_id', user.id).order('created_at', { ascending: false });

  return <main className="account-page"><nav className="account-topbar"><BrandLogo/><Link href="/#games" className="account-back"><ArrowLeft size={16}/> Kembali ke game</Link></nav><header className="account-header"><span className="section-eyebrow">PLAYER ACCOUNT</span><h1>Pesanan Saya</h1><p>Riwayat pembelian yang terhubung ke akunmu.</p></header>
    {error ? <div className="account-empty"><Package size={26}/><h2>Pesanan belum dapat dimuat</h2><p>Coba muat ulang halaman beberapa saat lagi.</p></div> : !orders?.length ? <div className="account-empty"><Package size={26}/><h2>Belum ada pesanan</h2><p>Pesanan saat kamu masuk akun akan muncul di sini.</p><Link className="primary-button" href="/#games">Jelajahi game</Link></div> : <section className="account-orders" aria-label="Daftar pesanan">{orders.map(order=><article key={order.id} className="account-order"><div className="account-order-top"><span className="section-eyebrow">INVOICE</span><strong>{order.order_number}</strong><span className={`account-status status-${order.status}`}>{statusLabels[order.status]??order.status}</span></div><div className="account-order-details"><div><small>GAME</small><strong>{order.game_name}</strong></div><div><small>PRODUK</small><strong>{order.product_name}</strong></div><div><small>TANGGAL</small><strong>{new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'}).format(new Date(order.created_at))}</strong></div><div><small>TOTAL</small><strong>{money(order.price_idr)}</strong></div></div><Link href={`/orders/${order.id}?token=${order.public_token}`} className="account-invoice">Lihat invoice <span>→</span></Link></article>)}</section>}
  </main>;
}
