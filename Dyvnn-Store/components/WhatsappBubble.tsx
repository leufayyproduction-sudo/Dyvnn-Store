'use client';
import { MessageCircle, X, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
export default function WhatsappBubble() {
  const [open, setOpen] = useState(false);
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  return <aside className="whatsapp-widget" aria-label="Customer support">{open && <div className="chat-panel"><div className="chat-header"><span className="support-avatar"><MessageCircle size={20}/></span><div><strong>Dyvnn Support</strong><span>Let’s get you back in the game</span></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close support"><X size={17}/></button></div><div className="chat-body"><p>Halo, Player! Ada yang bisa kami bantu?</p><span>Pilih game di katalog untuk melihat pilihan top up.</span>{phone ? <a className="primary-button" href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">Chat via WhatsApp <ArrowUpRight size={15}/></a> : <div className="preview-note">Preview support · Nomor WhatsApp toko belum dikonfigurasi.</div>}</div></div>}<button className="whatsapp-button" onClick={() => setOpen(!open)} aria-expanded={open}><span className="chat-hint">Need a hand? <b>Let’s chat</b></span><span className="whatsapp-icon">{open ? <X size={24}/> : <MessageCircle size={25}/>}<i/></span></button></aside>;
}
