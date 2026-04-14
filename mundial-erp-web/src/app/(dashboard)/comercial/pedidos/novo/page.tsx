'use client';

import { OrderForm } from '@/features/orders/components/order-form';
import { useCreateOrder } from '@/features/orders/hooks/use-orders';
import {
  useClientLookup,
  usePaymentMethods,
  useCarriers,
  usePriceTables,
  useProductLookup,
} from '@/features/orders/hooks/use-lookups';
import type { CreateOrderPayload } from '@/features/orders/types/order.types';

export default function NovoPedidoPage() {
  const createMutation = useCreateOrder();
  const { data: clients } = useClientLookup();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: carriers } = useCarriers();
  const { data: priceTables } = usePriceTables();
  const { data: products } = useProductLookup();

  function handleSubmit(data: CreateOrderPayload) {
    createMutation.mutate(data);
  }

  return (
    <OrderForm
      onSubmit={handleSubmit}
      isSubmitting={createMutation.isPending}
      clients={clients ?? []}
      paymentMethods={paymentMethods ?? []}
      carriers={carriers ?? []}
      priceTables={priceTables ?? []}
      products={products ?? []}
    />
  );
}
