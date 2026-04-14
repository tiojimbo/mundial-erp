'use client';

import Image from 'next/image';
import { RiImageLine } from '@remixicon/react';
import type { Product } from '../../types/product.types';

type ProductImagesTabProps = {
  product: Product;
};

export function ProductImagesTab({ product }: ProductImagesTabProps) {
  if (!product.images || product.images.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-12'>
        <RiImageLine className='mb-3 size-10 text-text-soft-400' />
        <p className='text-paragraph-sm text-text-soft-400'>
          Nenhuma imagem cadastrada para este produto.
        </p>
      </div>
    );
  }

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {product.images
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((image) => (
          <div
            key={image.id}
            className='relative aspect-square overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0 shadow-regular-xs'
          >
            <Image
              src={image.url}
              alt={`${product.name} - ${image.sortOrder}`}
              fill
              sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
              className='object-cover'
            />
          </div>
        ))}
    </div>
  );
}
