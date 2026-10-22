'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Clock3, Copy, Gamepad2, ImageUp, ShieldCheck, Star } from 'lucide-react';
import styles from '@/app/orders/[id]/order.module.css';
import BrandLogo from '@/components/BrandLogo';

type Order = { id:string;order_number:string;product_name:string;game_name:string;amount:number;price_idr:number;user_game_id:string;server_id:string|null;status:string;created_at:string;payments:{status:string}|{status:string}[]|null };
const money=(amount:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(amount);
const statusLabels:Record<string,string>={pending_payment:'Menunggu pembayaran',proof_submitted:'Bukti sedang diverifikasi',paid:'Pembayaran terkonfirmasi',processing:'Pesanan diproses',completed:'Pesanan selesai',rejected:'Bukti pembayaran ditolak',cancelled:'Order dibatalkan'};

export default function OrderCheckout({orderId,publicToken}:{orderId:string;publicToken:string}){
  const [order,setOrder]=useState<Order|null>(null);const [qrisUrl,setQrisUrl]=useState<string|null>(null);
  const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [file,setFile]=useState<File|null>(null);
  const [copied,setCopied]=useState(false);const [name,setName]=useState('');const [rating,setRating]=useState(5);const [comment,setComment]=useState('');const [reviewPhoto,setReviewPhoto]=useState<File|null>(null);
  const load=useCallback(async()=>{if(!publicToken){setError('Token order tidak tersedia. Gunakan tautan order lengkap.');return;}try{const response=await fetch(`/api/orders/${orderId}?token=${encodeURIComponent(publicToken)}`,{cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error||'Order tidak ditemukan.');setOrder(result.order);setQrisUrl(result.qrisUrl);setError('');}catch(cause){setError(cause instanceof Error?cause.message:'Gagal memuat order.');}},[orderId,publicToken]);
  useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),10000);return()=>window.clearInterval(timer);},[load]);
  async function uploadProof(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!file)return;setBusy(true);setMessage('');try{const form=new FormData();form.set('publicToken',publicToken);form.set('file',file);const response=await fetch(`/api/orders/${orderId}/proof`,{method:'POST',body:form});const result=await response.json();if(!response.ok)throw new Error(result.error||'Upload gagal.');setMessage(result.message);setFile(null);await load();}catch(cause){setMessage(cause instanceof Error?cause.message:'Upload gagal.');}finally{setBusy(false);}}
  async function submitReview(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setMessage('');try{const form=new FormData();form.set('orderId',orderId);form.set('publicToken',publicToken);form.set('displayName',name);form.set('rating',String(rating));form.set('comment',comment);if(reviewPhoto)form.set('photo',reviewPhoto);const response=await fetch('/api/reviews',{method:'POST',body:form});const result=await response.json();if(!response.ok)throw new Error(result.error||'Review gagal dikirim.');setMessage(result.message);}catch(cause){setMessage(cause instanceof Error?cause.message:'Review gagal dikirim.');}finally{setBusy(false);}}
  async function copyOrder(){if(!order)return;await navigator.clipboard.writeText(order.order_number);setCopied(true);window.setTimeout(()=>setCopied(false),1600);}
  return <main className={styles.page}><header className={styles.header}><BrandLogo className={styles.brandLogo}/><Link href="/#games" className={styles.back}><ArrowLeft size={15}/> Kembali ke game</Link></header>
    <div className={styles.content}><div className={styles.heading}><span className={styles.eyebrow}>SECURE CHECKOUT</span><h1>Order kamu.</h1><p>Ikuti langkah pembayaran untuk melanjutkan top up.</p></div>
      {error?<div className={styles.alert}>{error}</div>:!order?<div className={styles.loading}><span/> Memuat detail order…</div>:<div className={styles.columns}>
        <section className={styles.orderCard}><div className={styles.orderTop}><span className={styles.orderIcon}><Gamepad2 size={20}/></span><div><small>ORDER NUMBER</small><strong>{order.order_number}</strong></div><button onClick={copyOrder} aria-label="Salin order number">{copied?<Check size={15}/>:<Copy size={15}/>}</button></div>
          <div className={styles.status}><span/><strong>{statusLabels[order.status]??order.status}</strong><small>Status diperbarui otomatis</small></div>
          <div className={styles.lineItem}><span>{order.game_name} · {order.product_name}<small>User ID {order.user_game_id}{order.server_id?` · Server ${order.server_id}`:''}</small></span><strong>{money(order.price_idr)}</strong></div>
          <div className={styles.total}><span>Total pembayaran</span><strong>{money(order.price_idr)}</strong></div>
          <div className={styles.secure}><ShieldCheck size={15}/> Bukti pembayaran hanya bisa dilihat oleh admin toko.</div>
        </section>

        <section className={styles.paymentCard}><span className={styles.eyebrow}>PEMBAYARAN MANUAL</span><h2>Bayar dengan QRIS</h2><p>Scan QRIS berikut sesuai nominal order. Lalu kirim bukti pembayaran.</p>
          {qrisUrl?<img className={styles.qris} src={qrisUrl} alt="QRIS pembayaran Dyvnn Store"/>:<div className={styles.qrisMissing}>QRIS belum diunggah admin.</div>}
          <div className={styles.amount}>{money(order.price_idr)}</div>
          {['Simpan atau screenshot QRIS toko.','Bayar sesuai total yang tertera.','Unggah bukti pembayaran di bawah.'].map((step,index)=><div className={styles.step} key={step}><span>{index+1}</span>{step}</div>)}
          {['pending_payment','rejected','proof_submitted'].includes(order.status)&&<form className={styles.uploadForm} onSubmit={uploadProof}><label className={styles.fileLabel}><ImageUp size={17}/><span>{file?.name??'Pilih screenshot pembayaran'}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setFile(e.target.files?.[0]??null)}/></label><button disabled={busy||!file}>{busy?'Mengirim…':'Kirim bukti pembayaran'}</button><small>PNG, JPG, atau WEBP · maksimal 2 MB</small></form>}
          {message&&<p role="status" className={styles.message}>{message}</p>}
        </section>

        {order.status==='completed'&&<section className={styles.reviewCard}><span className={styles.eyebrow}>PLAYER REVIEW</span><h2>Bagaimana pengalamanmu?</h2><form onSubmit={submitReview}><label>Nama tampilan<input required minLength={2} maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="Nama kamu"/></label><label>Rating</label><div className={styles.rating}>{[1,2,3,4,5].map(value=><button type="button" key={value} onClick={()=>setRating(value)} aria-label={`${value} bintang`}><Star size={19} fill={value<=rating?'currentColor':'none'}/></button>)}</div><label>Ulasan<textarea required minLength={8} maxLength={1000} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Ceritakan pengalaman top up kamu"/></label><label className={styles.reviewPhoto}>Foto (opsional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setReviewPhoto(e.target.files?.[0]??null)}/><small>{reviewPhoto?.name??'PNG, JPG, atau WEBP · maksimal 2 MB'}</small></label><button disabled={busy}>Kirim review <Check size={15}/></button></form></section>}
      </div>}
      <p className={styles.refresh}><Clock3 size={13}/> Status order diperbarui otomatis setiap beberapa detik.</p>
    </div>
  </main>;
}
