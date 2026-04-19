'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  RiUserLine,
  RiMailLine,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine,
} from '@remixicon/react';
import * as InputPrimitive from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Button from '@/components/ui/button';
import { Root as Switch } from '@/components/ui/switch';
import { useAuth } from '@/providers/auth-provider';
import { useNotification } from '@/hooks/use-notification';
import { useUpdateProfile } from '../hooks/use-account';
import {
  accountSchema,
  type AccountFormData,
} from '../schemas/account.schema';
import { SettingsSection } from './settings-section';
import { AvatarUpload } from './avatar-upload';
import { ThemeColorPicker } from './theme-color-picker';
import { AppearancePicker } from './appearance-picker';

export function MyAccountSettings() {
  const { user } = useAuth();
  const { notification } = useNotification();
  const updateProfile = useUpdateProfile();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [twoFactorSms, setTwoFactorSms] = useState(false);
  const [twoFactorTotp, setTwoFactorTotp] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      fullName: user?.name ?? '',
      email: user?.email ?? '',
      currentPassword: '',
      password: '',
    },
  });

  function onSubmit(data: AccountFormData) {
    updateProfile.mutate(
      {
        fullName: data.fullName,
        email: data.email,
        currentPassword: data.currentPassword || undefined,
        password: data.password || undefined,
      },
      {
        onSuccess: () => {
          notification({
            title: 'Sucesso',
            description: 'Configurações salvas com sucesso.',
            status: 'success',
          });
        },
        onError: () => {
          notification({
            title: 'Erro',
            description: 'Falha ao salvar configurações.',
            status: 'error',
          });
        },
      },
    );
  }

  return (
    <div className='max-w-4xl'>
      <h1 className='mb-8 text-title-h4 font-bold text-text-strong-950'>
        Minhas configurações
      </h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Section 1: Identidade Visual */}
        <SettingsSection
          title='Identidade Visual'
          description='Personalize a aparência do seu workspace com uma imagem que represente sua marca.'
        >
          <div className='space-y-6'>
            <AvatarUpload />

            <div className='space-y-4'>
              {/* Nome completo */}
              <div className='space-y-1.5'>
                <Label.Root htmlFor='fullName'>Nome completo</Label.Root>
                <InputPrimitive.Root
                  hasError={!!errors.fullName}
                >
                  <InputPrimitive.Wrapper>
                    <InputPrimitive.Icon as={RiUserLine} />
                    <InputPrimitive.Input
                      id='fullName'
                      placeholder='Seu nome completo'
                      {...register('fullName')}
                    />
                  </InputPrimitive.Wrapper>
                </InputPrimitive.Root>
                {errors.fullName && (
                  <p className='text-paragraph-xs text-error-base'>
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className='space-y-1.5'>
                <Label.Root htmlFor='email'>E-mail</Label.Root>
                <InputPrimitive.Root hasError={!!errors.email}>
                  <InputPrimitive.Wrapper>
                    <InputPrimitive.Icon as={RiMailLine} />
                    <InputPrimitive.Input
                      id='email'
                      type='email'
                      placeholder='seu@email.com'
                      {...register('email')}
                    />
                  </InputPrimitive.Wrapper>
                </InputPrimitive.Root>
                {errors.email && (
                  <p className='text-paragraph-xs text-error-base'>
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Senha atual */}
              <div className='space-y-1.5'>
                <Label.Root htmlFor='currentPassword'>Senha atual</Label.Root>
                <InputPrimitive.Root
                  hasError={!!errors.currentPassword}
                >
                  <InputPrimitive.Wrapper>
                    <InputPrimitive.Icon as={RiLockLine} />
                    <InputPrimitive.Input
                      id='currentPassword'
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder='Digite sua senha atual'
                      {...register('currentPassword')}
                    />
                    <button
                      type='button'
                      tabIndex={-1}
                      onClick={() =>
                        setShowCurrentPassword(!showCurrentPassword)
                      }
                      className='flex shrink-0 items-center text-text-soft-400 transition-colors hover:text-text-sub-600'
                    >
                      {showCurrentPassword ? (
                        <RiEyeOffLine className='size-5' />
                      ) : (
                        <RiEyeLine className='size-5' />
                      )}
                    </button>
                  </InputPrimitive.Wrapper>
                </InputPrimitive.Root>
                {errors.currentPassword && (
                  <p className='text-paragraph-xs text-error-base'>
                    {errors.currentPassword.message}
                  </p>
                )}
              </div>

              {/* Nova senha */}
              <div className='space-y-1.5'>
                <Label.Root htmlFor='password'>Nova senha</Label.Root>
                <InputPrimitive.Root hasError={!!errors.password}>
                  <InputPrimitive.Wrapper>
                    <InputPrimitive.Icon as={RiLockLine} />
                    <InputPrimitive.Input
                      id='password'
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder='Deixe em branco para manter a atual'
                      {...register('password')}
                    />
                    <button
                      type='button'
                      tabIndex={-1}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className='flex shrink-0 items-center text-text-soft-400 transition-colors hover:text-text-sub-600'
                    >
                      {showNewPassword ? (
                        <RiEyeOffLine className='size-5' />
                      ) : (
                        <RiEyeLine className='size-5' />
                      )}
                    </button>
                  </InputPrimitive.Wrapper>
                </InputPrimitive.Root>
                {errors.password && (
                  <p className='text-paragraph-xs text-error-base'>
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Section 2: 2FA */}
        <SettingsSection
          title='Autenticação de dois fatores (2FA)'
          description='Mantenha sua conta segura habilitando a autenticação de dois fatores via SMS ou usando uma senha temporária (TOTP) de um aplicativo autenticador.'
        >
          <div className='space-y-4'>
            <div className='flex items-start gap-3'>
              <Switch
                checked={twoFactorSms}
                onCheckedChange={setTwoFactorSms}
              />
              <div>
                <p className='text-label-sm font-medium text-text-strong-950'>
                  Mensagem de Texto (SMS)
                </p>
                <p className='text-paragraph-xs text-text-sub-600'>
                  Receba um código de acesso único por SMS sempre que fizer
                  login.
                </p>
              </div>
            </div>

            <div className='flex items-start gap-3'>
              <Switch
                checked={twoFactorTotp}
                onCheckedChange={setTwoFactorTotp}
              />
              <div>
                <p className='text-label-sm font-medium text-text-strong-950'>
                  Aplicativo autenticador (TOTP)
                </p>
                <p className='text-paragraph-xs text-text-sub-600'>
                  Use um aplicativo para receber uma senha temporária única cada
                  vez que você fizer login.
                </p>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Section 3: Cor do Tema */}
        <SettingsSection
          title='Cor do tema'
          description='Escolha seu tema preferido para o aplicativo.'
        >
          <ThemeColorPicker />
        </SettingsSection>

        {/* Section 4: Aparência */}
        <SettingsSection
          title='Aparência'
          description='Escolha o modo claro ou escuro, ou alterne o modo automaticamente com base nas configurações do sistema.'
        >
          <AppearancePicker />
        </SettingsSection>

        {/* Save button */}
        <div className='flex justify-end py-6'>
          <Button.Root
            variant='primary'
            mode='filled'
            size='medium'
            type='submit'
            disabled={updateProfile.isPending}
            className='px-10'
          >
            {updateProfile.isPending ? 'Salvando...' : 'Salvar'}
          </Button.Root>
        </div>
      </form>
    </div>
  );
}
