import { cn } from '@/lib/utils';

type AppLogoSize = 'sm' | 'md' | 'lg';
type AppLogoVariant = 'dark' | 'light';

const SIZE_CLASS: Record<AppLogoSize, string> = {
  sm: 'text-label-md',
  md: 'text-label-lg',
  lg: 'text-title-h6',
};

const VARIANT_CLASS: Record<AppLogoVariant, string> = {
  dark: 'text-text-strong-950',
  light: 'text-static-white',
};

export function AppLogo({
  size = 'md',
  variant = 'dark',
  className,
}: {
  size?: AppLogoSize;
  variant?: AppLogoVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'font-medium tracking-tight',
        SIZE_CLASS[size],
        VARIANT_CLASS[variant],
        className,
      )}
    >
      Mundial ERP
    </span>
  );
}
