'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RiEyeLine,
  RiEyeOffLine,
  RiGoogleFill,
  RiTeamLine,
  RiBarChartBoxLine,
  RiPulseLine,
  RiSettings3Line,
  RiLoader4Line,
} from '@remixicon/react';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Checkbox from '@/components/ui/checkbox';
import * as SocialButton from '@/components/ui/social-button';
import * as Divider from '@/components/ui/divider';
import * as LinkButton from '@/components/ui/link-button';
import * as Hint from '@/components/ui/hint';
import { AppLogo } from '@/components/shared/app-logo';
import { useAuth } from '@/providers/auth-provider';
import { siteConfig } from '@/config/site';
import {
  loginSchema,
  type LoginFormData,
} from '@/features/auth/schemas/login.schema';

const AUTOPLAY_MS = 4000;
const FEATURES = [
  {
    icon: RiTeamLine,
    label: 'Times centralizados',
    description: 'Equipes, áreas e responsáveis num só painel',
  },
  {
    icon: RiBarChartBoxLine,
    label: 'Métricas que importam',
    description: 'Indicadores reais do que move o resultado',
  },
  {
    icon: RiPulseLine,
    label: 'Dados em tempo real',
    description: 'Atualização contínua, sem espera',
  },
  {
    icon: RiSettings3Line,
    label: 'Configurável do jeito que você usa',
    description: 'Adapta ao fluxo do seu time, não o contrário',
  },
] as const;

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setActiveFeature((i) => (i + 1) % FEATURES.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [isPaused]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      await login(data);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Erro ao fazer login',
      );
    }
  }

  return (
    <div className='flex h-full'>
      <div
        className='relative flex flex-col overflow-hidden bg-bg-white-0'
        style={{ flex: '0 0 58%' }}
      >
        <header className='flex shrink-0 items-center px-10 pt-8'>
          <AppLogo size='md' variant='dark' />
        </header>

        <div className='flex flex-1 items-center justify-center px-8'>
          <div
            className='flex flex-col items-stretch'
            style={{ width: '100%', maxWidth: 392 }}
          >
            <div className='flex flex-col gap-1.5'>
              <h1 className='text-title-h4 text-text-strong-950'>
                Bem-vindo de volta
              </h1>
              <p className='text-paragraph-md text-text-sub-600'>
                Entre na sua conta pra continuar
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className='mt-8 flex w-full flex-col'
            >
              <div className='flex w-full flex-col gap-1'>
                <Label.Root htmlFor='email'>Email</Label.Root>
                <Input.Root hasError={!!errors.email}>
                  <Input.Wrapper>
                    <Input.Input
                      id='email'
                      type='email'
                      placeholder='seu@email.com'
                      autoComplete='email'
                      {...register('email')}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {errors.email && (
                  <Hint.Root hasError>{errors.email.message}</Hint.Root>
                )}
              </div>

              <div className='mt-3 flex w-full flex-col gap-1'>
                <Label.Root htmlFor='password'>Senha</Label.Root>
                <Input.Root hasError={!!errors.password}>
                  <Input.Wrapper>
                    <Input.Input
                      id='password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='••••••••••'
                      autoComplete='current-password'
                      {...register('password')}
                    />
                    <button
                      type='button'
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className='text-text-soft-400 transition-colors hover:text-text-sub-600'
                      aria-label={
                        showPassword ? 'Esconder senha' : 'Mostrar senha'
                      }
                    >
                      {showPassword ? (
                        <RiEyeOffLine className='size-5' />
                      ) : (
                        <RiEyeLine className='size-5' />
                      )}
                    </button>
                  </Input.Wrapper>
                </Input.Root>
                {errors.password && (
                  <Hint.Root hasError>{errors.password.message}</Hint.Root>
                )}
              </div>

              <div className='mt-6 flex w-full items-center justify-between'>
                <label
                  htmlFor='remember'
                  className='flex items-center gap-2 text-paragraph-sm text-text-strong-950'
                >
                  <Checkbox.Root id='remember' />
                  Mantenha-me conectado
                </label>
                <LinkButton.Root
                  type='button'
                  variant='gray'
                  size='medium'
                  underline
                >
                  Esqueceu a senha?
                </LinkButton.Root>
              </div>

              {serverError && (
                <Hint.Root hasError className='mt-4'>
                  {serverError}
                </Hint.Root>
              )}

              <button
                type='submit'
                disabled={isSubmitting}
                className='mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-10 bg-[#0A1624] text-label-sm text-static-white transition duration-200 hover:bg-[#0A1624]/90 disabled:pointer-events-none disabled:bg-bg-weak-50 disabled:text-text-disabled-300'
              >
                {isSubmitting && (
                  <RiLoader4Line className='size-4 animate-spin' />
                )}
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className='mt-6 w-full'>
              <Divider.Root variant='line-text'>OU CONTINUE COM</Divider.Root>
            </div>

            <SocialButton.Root
              brand='google'
              mode='stroke'
              className='mt-6 w-full'
              type='button'
            >
              <SocialButton.Icon as={RiGoogleFill} />
              Continuar com Google
            </SocialButton.Root>
          </div>
        </div>

        <div className='h-8 shrink-0' />
      </div>

      <aside className='relative hidden flex-1 overflow-hidden bg-[#0A1624] lg:flex'>
        <svg
          className='pointer-events-none absolute -right-32 -top-32 size-[640px] opacity-30'
          viewBox='0 0 640 640'
          fill='none'
          aria-hidden
        >
          <circle
            cx='320'
            cy='320'
            r='300'
            stroke='white'
            strokeWidth='1'
            opacity='0.35'
          />
          <circle
            cx='320'
            cy='320'
            r='220'
            stroke='white'
            strokeWidth='1'
            opacity='0.25'
          />
          <circle
            cx='320'
            cy='320'
            r='140'
            stroke='white'
            strokeWidth='1'
            opacity='0.2'
          />
          <circle
            cx='320'
            cy='320'
            r='70'
            stroke='white'
            strokeWidth='1'
            opacity='0.15'
          />
        </svg>

        <svg
          className='pointer-events-none absolute bottom-10 right-10 size-32 opacity-20'
          viewBox='0 0 128 128'
          fill='none'
          aria-hidden
        >
          <path
            d='M0 64 L128 64 M64 0 L64 128'
            stroke='white'
            strokeWidth='1'
          />
          <circle cx='64' cy='64' r='4' fill='white' />
        </svg>

        <div className='relative z-10 flex h-full w-full flex-col'>
          <div className='flex flex-1 items-center justify-center px-12'>
            <div
              className='flex max-w-md flex-col items-center gap-12'
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <h2 className='text-center text-title-h3 text-static-white'>
                {siteConfig.tagline}
              </h2>

              <div
                key={activeFeature}
                className='relative flex animate-feature-in flex-col items-center gap-5'
                aria-live='polite'
              >
                <span
                  className='bg-static-white/10 pointer-events-none absolute -inset-16 rounded-full blur-3xl transition-transform duration-700'
                  style={{
                    transform: `translateX(${(activeFeature - (FEATURES.length - 1) / 2) * 28}px)`,
                  }}
                  aria-hidden
                />
                {(() => {
                  const Icon = FEATURES[activeFeature].icon;
                  return (
                    <span className='bg-static-white/10 ring-static-white/20 relative flex size-24 items-center justify-center rounded-2xl ring-1 ring-inset backdrop-blur-sm'>
                      <span
                        className='from-static-white/20 pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br to-transparent'
                        aria-hidden
                      />
                      <span
                        className='ring-static-white/10 pointer-events-none absolute -inset-1.5 rounded-3xl ring-1'
                        aria-hidden
                      />
                      <Icon className='relative size-10 text-static-white' />
                    </span>
                  );
                })()}
                <div className='flex flex-col items-center gap-2'>
                  <p className='text-center text-title-h5 text-static-white'>
                    {FEATURES[activeFeature].label}
                  </p>
                  <p className='text-static-white/60 max-w-[20rem] text-center text-paragraph-md'>
                    {FEATURES[activeFeature].description}
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-2' role='tablist'>
                {FEATURES.map((feature, i) => {
                  const isActive = i === activeFeature;
                  return (
                    <button
                      key={feature.label}
                      type='button'
                      role='tab'
                      aria-selected={isActive}
                      aria-label={feature.label}
                      onClick={() => setActiveFeature(i)}
                      className={
                        isActive
                          ? 'bg-static-white/25 relative h-1.5 w-8 overflow-hidden rounded-full transition-all duration-300'
                          : 'bg-static-white/30 hover:bg-static-white/50 h-1.5 w-1.5 rounded-full transition-all duration-300'
                      }
                    >
                      {isActive && (
                        <span
                          key={activeFeature}
                          className='absolute inset-y-0 left-0 animate-dot-progress rounded-full bg-static-white'
                          style={{
                            animationPlayState: isPaused ? 'paused' : 'running',
                          }}
                          aria-hidden
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
