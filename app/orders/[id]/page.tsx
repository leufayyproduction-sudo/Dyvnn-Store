import OrderCheckout from '@/components/OrderCheckout';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ id }, { token }] = await Promise.all([params, searchParams]);
  return <OrderCheckout orderId={id} publicToken={token ?? ''} />;
}
