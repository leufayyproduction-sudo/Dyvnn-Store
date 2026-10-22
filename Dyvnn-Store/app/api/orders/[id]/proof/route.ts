import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { getErrorMessage } from '@/lib/errors';

const proofSchema = z.object({ orderId: z.string().uuid(), publicToken: z.string().uuid() });
function detectImage(bytes: Uint8Array): { extension: string; contentType: string } | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return { extension: 'png', contentType: 'image/png' };
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { extension: 'jpg', contentType: 'image/jpeg' };
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return { extension: 'webp', contentType: 'image/webp' };
  return null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limit = rateLimit(request, 'payment-proof', 5, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: 'Terlalu banyak upload. Coba lagi nanti.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Form upload tidak valid.' }, { status: 400 });
  const { id } = await params;
  const identity = proofSchema.safeParse({ orderId: id, publicToken: form.get('publicToken') });
  const file = form.get('file');
  if (!identity.success || !(file instanceof File) || file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'Unggah JPG, PNG, atau WEBP maksimal 2 MB dan pastikan token order benar.' }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = detectImage(bytes);
  if (!image) return NextResponse.json({ error: 'Isi file harus berupa gambar PNG, JPG, atau WEBP yang valid.' }, { status: 400 });

  const supabase = createAdminClient();
  const path = `${id}/${randomUUID()}.${image.extension}`;
  const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(path, bytes, {
    contentType: image.contentType, upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: 'Bukti pembayaran gagal diunggah.' }, { status: 500 });

  const { data, error } = await supabase.rpc('submit_store_payment_proof', {
    p_order_id: id, p_public_token: identity.data.publicToken, p_proof_path: path,
  });
  if (error || data !== true) {
    await supabase.storage.from('payment-proofs').remove([path]);
    if (error) {
      console.error('[Dyvnn Store] Payment proof submission failed:', error);
      const detail = getErrorMessage(error);
      const conflicts: Record<string, string> = {
        ORDER_NOT_FOUND: 'Order tidak ditemukan. Periksa kembali invoice pembayaran.',
        ORDER_NOT_PAYABLE: 'Order ini sudah tidak menerima bukti pembayaran.',
        PAYMENT_PROOF_NOT_ALLOWED: 'Order ini sudah tidak menerima bukti pembayaran.',
      };
      const code = Object.keys(conflicts).find((value) => detail.includes(value));
      if (code) return NextResponse.json({ error: conflicts[code] }, { status: 409 });
      return NextResponse.json({ error: 'Bukti pembayaran belum dapat dikirim. Silakan coba lagi nanti.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Order tidak ditemukan atau sudah tidak menerima bukti pembayaran.' }, { status: 409 });
  }
  return NextResponse.json({ success: true, message: 'Bukti pembayaran terkirim dan menunggu verifikasi admin.' });
}
