'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowDownToLine, BarChart3, Check, ChevronRight, CircleDollarSign, Eye, Gamepad2, LayoutDashboard, LogOut, Package, Plus, QrCode, Star, Upload, Users, Wallet, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BrandLogo from '@/components/BrandLogo';
import styles from '@/app/admin/admin.module.css';

type Tab = 'dashboard'|'products'|'orders'|'qris'|'reviews'|'analytics';
type Data = Record<string, any>;
type ProductDraft = { gameId:string; name:string; amount:string; priceIdr:string; bonus:string };
const navigation: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id:'dashboard',label:'Dashboard',icon:LayoutDashboard }, { id:'products',label:'Products',icon:Package },
  { id:'orders',label:'Orders',icon:Wallet }, { id:'qris',label:'QRIS',icon:QrCode },
  { id:'reviews',label:'Reviews',icon:Star }, { id:'analytics',label:'Analytics',icon:BarChart3 },
];
const money=(amount:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(amount||0);
const date=(value:string)=>new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
const statusText: Record<string,string>={pending_payment:'Menunggu bayar',proof_submitted:'Perlu verifikasi',paid:'Dibayar',processing:'Diproses',completed:'Selesai',rejected:'Ditolak',cancelled:'Dibatalkan'};

export default function AdminDashboard({email}:{email:string}) {
  const [tab,setTab]=useState<Tab>('dashboard');
  const [data,setData]=useState<Data>({});
  const [loading,setLoading]=useState(false);
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [newProduct,setNewProduct]=useState({gameId:'mlbb',name:'',amount:'',priceIdr:'',bonus:''});
  const [qrisFile,setQrisFile]=useState<File|null>(null);
  const [qrisProductId,setQrisProductId]=useState('');
  const router=useRouter();

  const load=useCallback(async (section:Tab)=>{
    setLoading(true);setNotice('');
    try{const response=await fetch(`/api/admin/${section}`,{cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error||'Gagal memuat data.');setData(result);}
    catch(error){setNotice(error instanceof Error?error.message:'Gagal memuat data.');}
    finally{setLoading(false);}
  },[]);
  useEffect(()=>{void load(tab);},[tab,load]);

  async function mutate(url:string,method:'POST'|'PATCH',body:BodyInit,contentType?:string){
    setBusy(true);setNotice('');
    try{const response=await fetch(url,{method,headers:contentType?{'Content-Type':contentType}:undefined,body});const result=await response.json();if(!response.ok)throw new Error(result.error||'Perubahan gagal disimpan.');setNotice('Perubahan berhasil disimpan.');await load(tab);}
    catch(error){setNotice(error instanceof Error?error.message:'Perubahan gagal disimpan.');}
    finally{setBusy(false);}
  }
  const patch=(resource:string,body:unknown)=>mutate(`/api/admin/${resource}`,'PATCH',JSON.stringify(body),'application/json');

  async function addProduct(event:React.FormEvent<HTMLFormElement>){event.preventDefault();await mutate('/api/admin/products','POST',JSON.stringify(newProduct),'application/json');setNewProduct({gameId:'mlbb',name:'',amount:'',priceIdr:'',bonus:''});}
  async function uploadQris(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const productId=qrisProductId||data.products?.[0]?.id;if(!qrisFile||!productId)return;const form=new FormData();form.set('file',qrisFile);form.set('productId',productId);await mutate('/api/admin/qris','POST',form);setQrisFile(null);}
  async function signOut(){await createClient().auth.signOut();router.replace('/admin/login');router.refresh();}

  const title=navigation.find(item=>item.id===tab)?.label??'Dashboard';
  return <main className={styles.adminShell}>
    <aside className={styles.sidebar}>
      <div className={styles.adminBrand}><BrandLogo className={styles.adminBrandLogo}/><small>ADMIN CONSOLE</small></div>
      <span className={styles.navLabel}>WORKSPACE</span>
      <nav>{navigation.map(({id,label,icon:Icon})=><button key={id} className={tab===id?styles.navActive:styles.navItem} onClick={()=>setTab(id)}><Icon size={17}/>{label}{id==='orders'&&data.pending>0&&<i>{data.pending}</i>}</button>)}</nav>
      <div className={styles.sidebarFoot}><span className={styles.adminAvatar}>{email.slice(0,1).toUpperCase()}</span><div className={styles.adminIdentity}><strong>{email}</strong><small>Store admin</small></div><button onClick={signOut} aria-label="Keluar"><LogOut size={16}/></button></div>
    </aside>

    <section className={styles.adminMain}>
      <header className={styles.adminTopbar}><div><span className={styles.breadcrumb}>DYVNN STORE <i>/</i></span><h1>{title}</h1></div><a href="/" className={styles.viewStore}><Eye size={15}/> Lihat storefront</a></header>
      {notice&&<div className={styles.notice} role="status"><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Tutup"><X size={14}/></button></div>}
      {loading&&<div className={styles.loading}><span/> Memuat data Supabase…</div>}
      {!loading&&tab==='dashboard'&&<DashboardView data={data} setTab={setTab}/>}
      {!loading&&tab==='analytics'&&<AnalyticsView data={data}/>}
      {!loading&&tab==='products'&&<ProductsView data={data} draft={newProduct} setDraft={setNewProduct} onSubmit={addProduct} onPatch={(body)=>void patch('products',body)} busy={busy}/>}
      {!loading&&tab==='orders'&&<OrdersView data={data} onPatch={(body)=>void patch('orders',body)} busy={busy}/>}
      {!loading&&tab==='qris'&&<QrisView data={data} file={qrisFile} setFile={setQrisFile} productId={qrisProductId||data.products?.[0]?.id||''} setProductId={setQrisProductId} onSubmit={uploadQris} busy={busy}/>}
      {!loading&&tab==='reviews'&&<ReviewsView data={data} onPatch={(body)=>void patch('reviews',body)} busy={busy}/>}
    </section>
  </main>;
}

function DashboardView({data,setTab}:{data:Data;setTab:(tab:Tab)=>void}){
  const metrics=[{label:'Revenue',value:money(data.revenue),icon:CircleDollarSign,detail:'Paid, processing, and completed'},{label:'Orders',value:(data.orders??0).toLocaleString('id-ID'),icon:Package,detail:`${data.pending??0} menunggu verifikasi`},{label:'Visitors',value:(data.visitors??0).toLocaleString('id-ID'),icon:Users,detail:'Sesi unik · 30 hari'},{label:'Produk aktif',value:(data.activeProducts??0).toLocaleString('id-ID'),icon:Gamepad2,detail:'Tersedia di storefront'}];
  return <><div className={styles.welcome}><div><span>STORE OVERVIEW</span><h2>Your store, at a glance.</h2><p>Ringkasan order dan aktivitas Dyvnn Store.</p></div><span className={styles.live}><i/> SUPABASE CONNECTED</span></div>
    <div className={styles.metricGrid}>{metrics.map(({label,value,icon:Icon,detail})=><article key={label} className={styles.metricCard}><div className={styles.metricTop}><span>{label}</span><Icon size={17}/></div><strong>{value}</strong><small>{detail}</small></article>)}</div>
    <div className={styles.dashboardGrid}><section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>PERFORMA PRODUK</span><h3>Popular games</h3></div><button onClick={()=>setTab('analytics')}>Analytics <ChevronRight size={14}/></button></div>{data.popularGames?.length?<div className={styles.popularList}>{data.popularGames.slice(0,5).map((game:Data,index:number)=><div key={game.id} className={styles.popularRow}><span className={styles.rank}>0{index+1}</span><div className={styles.popularInfo}><strong>{game.name}</strong><small>{game.count} orders</small></div><strong>{money(game.revenue)}</strong><span className={styles.barTrack}><i style={{width:`${Math.max(7,game.count/Math.max(...data.popularGames.map((g:Data)=>g.count))*100)}%`}}/></span></div>)}</div>:<Empty text="Belum ada order untuk ditampilkan."/>}</section>
      <section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>ACTIVITY</span><h3>Recent orders</h3></div><button onClick={()=>setTab('orders')}>Semua order <ChevronRight size={14}/></button></div>{data.recentOrders?.length?<div className={styles.recentList}>{data.recentOrders.slice(0,5).map((order:Data)=><div key={order.id}><span className={styles.orderDot}/><span><strong>{order.order_number}</strong><small>{order.game_name} · {date(order.created_at)}</small></span><b>{money(order.price_idr)}</b></div>)}</div>:<Empty text="Order baru akan muncul di sini."/>}</section></div>
  </>;
}

function AnalyticsView({data}:{data:Data}){return <><div className={styles.sectionIntro}><div><span className={styles.eyebrow}>LAST 30 DAYS</span><h2>Analytics</h2><p>Visitor dihitung per sesi browser unik yang membuka halaman storefront.</p></div><Activity size={23}/></div><div className={styles.metricGrid}><article className={styles.metricCard}><div className={styles.metricTop}><span>Visitors</span><Eye size={17}/></div><strong>{(data.visitors??0).toLocaleString('id-ID')}</strong><small>Unique sessions in 30 days</small></article><article className={styles.metricCard}><div className={styles.metricTop}><span>Orders</span><Package size={17}/></div><strong>{(data.orders??0).toLocaleString('id-ID')}</strong><small>Total order records</small></article><article className={styles.metricCard}><div className={styles.metricTop}><span>Revenue</span><CircleDollarSign size={17}/></div><strong>{money(data.revenue)}</strong><small>Confirmed and completed payments</small></article></div><section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>BY GAME</span><h3>Popular games</h3></div></div>{data.popularGames?.length?<div className={styles.tableWrap}><table><thead><tr><th>Game</th><th>Orders</th><th>Revenue</th><th>Share</th></tr></thead><tbody>{data.popularGames.map((game:Data)=><tr key={game.id}><td>{game.name}</td><td>{game.count}</td><td>{money(game.revenue)}</td><td><div className={styles.barTrack}><i style={{width:`${Math.max(7,game.count/Math.max(...data.popularGames.map((g:Data)=>g.count))*100)}%`}}/></div></td></tr>)}</tbody></table></div>:<Empty text="Belum ada data analytics."/>}</section></>}

function ProductsView({data,draft,setDraft,onSubmit,onPatch,busy}:{data:Data;draft:ProductDraft;setDraft:React.Dispatch<React.SetStateAction<ProductDraft>>;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void;onPatch:(body:unknown)=>void;busy:boolean}){
  return <><div className={styles.sectionIntro}><div><span className={styles.eyebrow}>CATALOG MANAGEMENT</span><h2>Products</h2><p>Tambah nominal dan atur harga produk di storefront.</p></div></div><section className={styles.panel}><div className={styles.panelHeading}><div><h3><Plus size={16}/> Tambah produk</h3></div></div><form className={styles.productForm} onSubmit={onSubmit}><label>Game<select value={draft.gameId} onChange={e=>setDraft({...draft,gameId:e.target.value})}>{(data.games??[]).map((game:Data)=><option key={game.id} value={game.id}>{game.name}</option>)}</select></label><label>Nama produk<input required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="100 Diamonds"/></label><label>Jumlah<input required type="number" min="1" value={draft.amount} onChange={e=>setDraft({...draft,amount:e.target.value})} placeholder="100"/></label><label>Harga (IDR)<input required type="number" min="1" value={draft.priceIdr} onChange={e=>setDraft({...draft,priceIdr:e.target.value})} placeholder="28000"/></label><label>Bonus (opsional)<input value={draft.bonus} onChange={e=>setDraft({...draft,bonus:e.target.value})} placeholder="Pilihan populer"/></label><button disabled={busy}><Plus size={15}/> Tambah produk</button></form></section><section className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>ALL PRODUCTS</span><h3>Kelola katalog</h3></div></div><div className={styles.tableWrap}><table><thead><tr><th>Produk</th><th>Game</th><th>Harga</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{(data.products??[]).map((product:Data)=><ProductRow key={product.id} product={product} onPatch={onPatch} busy={busy}/>)}</tbody></table>{!data.products?.length&&<Empty text="Belum ada produk di database."/>}</div></section></>;
}
function ProductRow({product,onPatch,busy}:{product:Data;onPatch:(body:unknown)=>void;busy:boolean}){const [price,setPrice]=useState(String(product.price_idr));return <tr><td><strong>{product.name}</strong><small className={styles.subCell}>{product.amount.toLocaleString('id-ID')} units</small></td><td>{product.games?.name??product.game_id}</td><td><div className={styles.inlinePrice}><span>Rp</span><input aria-label={`Harga ${product.name}`} type="number" min="1" value={price} onChange={e=>setPrice(e.target.value)}/><button disabled={busy||Number(price)===product.price_idr} onClick={()=>onPatch({id:product.id,priceIdr:Number(price)})} aria-label="Simpan harga"><Check size={14}/></button></div></td><td><span className={product.is_active?styles.statusActive:styles.statusMuted}>{product.is_active?'Aktif':'Disembunyikan'}</span></td><td><button className={styles.textAction} onClick={()=>onPatch({id:product.id,isActive:!product.is_active})}>{product.is_active?'Nonaktifkan':'Aktifkan'}</button></td></tr>}

function OrdersView({data,onPatch,busy}:{data:Data;onPatch:(body:unknown)=>void;busy:boolean}){const statuses=['pending_payment','proof_submitted','paid','processing','completed','rejected','cancelled'];return <><div className={styles.sectionIntro}><div><span className={styles.eyebrow}>PAYMENT OPERATIONS</span><h2>Orders</h2><p>Verifikasi bukti pembayaran dan perbarui status pesanan.</p></div></div><section className={styles.panel}><div className={styles.tableWrap}><table><thead><tr><th>Order</th><th>Game account</th><th>Total</th><th>Bukti</th><th>Status</th><th>Dibuat</th></tr></thead><tbody>{(data.orders??[]).map((order:Data)=><tr key={order.id}><td><strong>{order.order_number}</strong><small className={styles.subCell}>{order.product_name}</small></td><td>{order.user_game_id}{order.server_id&&<small className={styles.subCell}>Server {order.server_id}</small>}</td><td>{money(order.price_idr)}</td><td>{order.payment_proof_url?<a className={styles.proofLink} href={order.payment_proof_url} target="_blank" rel="noreferrer"><ArrowDownToLine size={14}/> Lihat bukti</a>:<span className={styles.mutedText}>Belum ada</span>}</td><td><select aria-label={`Status ${order.order_number}`} className={styles.statusSelect} value={order.status} disabled={busy} onChange={event=>onPatch({id:order.id,status:event.target.value})}>{statuses.map(status=><option key={status} value={status}>{statusText[status]}</option>)}</select></td><td>{date(order.created_at)}</td></tr>)}</tbody></table>{!data.orders?.length&&<Empty text="Belum ada order masuk."/>}</div></section></>}

function QrisView({data,file,setFile,productId,setProductId,onSubmit,busy}:{data:Data;file:File|null;setFile:(file:File|null)=>void;productId:string;setProductId:(id:string)=>void;onSubmit:(event:React.FormEvent<HTMLFormElement>)=>void;busy:boolean}){const products:Data[]=data.products??[];const selected=products.find(product=>product.id===productId)??products[0];return <><div className={styles.sectionIntro}><div><span className={styles.eyebrow}>PAYMENT METHOD</span><h2>QRIS</h2><p>Setiap QRIS terhubung ke produk yang dipilih dan ditampilkan pada checkout produk itu.</p></div></div><section className={styles.qrisGrid}><article className={styles.panel}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>ACTIVE PAYMENT CODE</span><h3>{selected?.name??'QRIS produk'}</h3></div><QrCode size={19}/></div>{selected?.qrisUrl?<img className={styles.qrisPreview} src={selected.qrisUrl} alt={`QRIS ${selected.name}`}/>:<div className={styles.qrisEmpty}><QrCode size={40}/><strong>Belum ada QRIS</strong><span>Pilih produk di form lalu unggah kode QRIS-nya.</span></div>}</article><form className={styles.panel} onSubmit={onSubmit}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>UPLOAD IMAGE</span><h3>QRIS per produk</h3></div></div><label>Produk<select required value={productId} onChange={e=>setProductId(e.target.value)}><option value="">Pilih produk</option>{products.map(product=><option key={product.id} value={product.id}>{product.games?.name??product.game_id} · {product.name}</option>)}</select></label><label className={styles.uploadBox}><Upload size={22}/><strong>{file?.name??'Pilih gambar QRIS'}</strong><span>PNG, JPG, atau WEBP · maks. 2 MB</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setFile(e.target.files?.[0]??null)}/></label><button className={styles.primaryButton} disabled={busy||!file||!productId}><Upload size={15}/>{busy?'Mengunggah…':'Upload QRIS'}</button></form></section></>}

function ReviewsView({data,onPatch,busy}:{data:Data;onPatch:(body:unknown)=>void;busy:boolean}){return <><div className={styles.sectionIntro}><div><span className={styles.eyebrow}>COMMUNITY</span><h2>Reviews</h2><p>Moderasi ulasan sebelum ditampilkan di website.</p></div></div><div className={styles.reviewGrid}>{(data.reviews??[]).map((review:Data)=><article key={review.id} className={styles.reviewCard}><div className={styles.reviewStars}>{'★'.repeat(review.rating)}<span>{'★'.repeat(5-review.rating)}</span></div><p>“{review.comment}”</p><div className={styles.reviewMeta}><strong>{review.display_name}</strong><span>{review.games?.name} · {review.orders?.order_number}</span></div><button className={review.is_published?styles.reviewHide:styles.reviewPublish} disabled={busy} onClick={()=>onPatch({id:review.id,isPublished:!review.is_published})}>{review.is_published?'Sembunyikan':'Publish review'}</button></article>)}{!data.reviews?.length&&<Empty text="Belum ada review."/>}</div></>}

function Empty({text}:{text:string}){return <div className={styles.empty}><Gamepad2 size={21}/><span>{text}</span></div>}
