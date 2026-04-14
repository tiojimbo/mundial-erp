import { createTV } from 'tailwind-variants';
export type { VariantProps, ClassValue } from 'tailwind-variants';

import { twMergeConfig } from '@/lib/cn';

export const tv = createTV({
  twMergeConfig,
});
