'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RiEyeLine,
  RiEyeOffLine,

  RiGoogleFill,
} from '@remixicon/react';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Checkbox from '@/components/ui/checkbox';
import * as SocialButton from '@/components/ui/social-button';
import * as Divider from '@/components/ui/divider';
import * as LinkButton from '@/components/ui/link-button';
import * as Hint from '@/components/ui/hint';
import { useAuth } from '@/providers/auth-provider';
import {
  loginSchema,
  type LoginFormData,
} from '@/features/auth/schemas/login.schema';

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

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
      {/*
        White column — 58% of viewport (Figma: 836/1440).
        Inline style guarantees the width regardless of flex negotiation.
      */}
      <div
        className='relative flex flex-col overflow-hidden bg-bg-white-0'
        style={{ flex: '0 0 58%' }}
      >
        {/* Header spacer */}
        <div className='h-8 shrink-0' />

        {/*
          Form wrapper — centers the 392px content block both axes.
          Inline maxWidth guarantees the constraint independent of Tailwind JIT.
        */}
        <div className='flex flex-1 items-center justify-center px-8'>
          <div
            className='flex flex-col items-center'
            style={{ width: '100%', maxWidth: 392 }}
          >
            {/* ── Title ── */}
            <div className='mt-3 flex flex-col items-center gap-1 text-center'>
              <h1 className='text-title-h5 text-text-strong-950'>
                Login
              </h1>
              <p className='text-paragraph-md text-text-sub-600'>
                Insira seus dados para entrar
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className='mt-8 flex w-full flex-col'>
              {/* ── Email ── */}
              <div className='flex w-full flex-col gap-1'>
                <Label.Root htmlFor='email'>
                  Email
                </Label.Root>
                <Input.Root hasError={!!errors.email}>
                  <Input.Wrapper>
                    <Input.Input
                      id='email'
                      type='email'
                      placeholder='seu@email.com'
                      {...register('email')}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {errors.email && (
                  <Hint.Root hasError>{errors.email.message}</Hint.Root>
                )}
              </div>

              {/* ── Password ── */}
              <div className='mt-3 flex w-full flex-col gap-1'>
                <Label.Root htmlFor='password'>
                  Senha
                </Label.Root>
                <Input.Root hasError={!!errors.password}>
                  <Input.Wrapper>
                    <Input.Input
                      id='password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='••••••••••'
                      {...register('password')}
                    />
                    <button
                      type='button'
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className='text-text-soft-400 transition-colors hover:text-text-sub-600'
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

              {/* ── Remember + Forgot ── */}
              <div className='mt-6 flex w-full items-center justify-between'>
                <label className='flex items-center gap-2 text-paragraph-sm text-text-strong-950'>
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

              {/* ── Server error ── */}
              {serverError && (
                <Hint.Root hasError className='mt-4'>{serverError}</Hint.Root>
              )}

              {/* ── Green "Entrar" button ── */}
              <button
                type='submit'
                disabled={isSubmitting}
                className='mt-6 flex h-10 w-full items-center justify-center rounded-10 border border-[#76a91a] bg-[#76a91a] text-label-sm text-static-white transition duration-200 hover:bg-[#6b9a17] disabled:pointer-events-none disabled:border-transparent disabled:bg-bg-weak-50 disabled:text-text-disabled-300'
              >
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            {/* ── "Ou continue com" divider ── */}
            <div className='mt-6 w-full'>
              <Divider.Root variant='line-text'>OU CONTINUE COM</Divider.Root>
            </div>

            {/* ── Google social button ── */}
            <SocialButton.Root
              brand='google'
              mode='stroke'
              className='mt-6 w-full'
              type='button'
            >
              <SocialButton.Icon as={RiGoogleFill} />
            </SocialButton.Root>
          </div>
        </div>

        {/* Footer spacer */}
        <div className='h-8 shrink-0' />
      </div>

      {/* ── Green panel ── */}
      <div className='hidden flex-1 items-center justify-center lg:flex'>
      </div>

      {/* Decorative circles */}
      <svg
        className='pointer-events-none absolute right-0 top-0 size-[596px] opacity-20'
        viewBox='0 0 596 596'
        fill='none'
      >
        <circle cx='298' cy='298' r='280' stroke='white' strokeWidth='1' opacity='0.3' />
        <circle cx='298' cy='298' r='200' stroke='white' strokeWidth='1' opacity='0.2' />
        <circle cx='298' cy='298' r='120' stroke='white' strokeWidth='1' opacity='0.15' />
      </svg>
    </div>
  );
}
