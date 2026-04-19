'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiSaveLine,
  RiLoader4Line,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Textarea from '@/components/ui/textarea';
import * as Hint from '@/components/ui/hint';
import { useAuth } from '@/providers/auth-provider';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useCreateWorkspace } from '../hooks/use-create-workspace';
import { workspaceService } from '../services/workspace.service';
import { toSlug } from '../utils/to-slug';
import type { WorkspaceRole } from '../types/workspace.types';

type Purpose = 'work' | 'personal' | 'school';

const PURPOSE_OPTIONS: ReadonlyArray<{ id: Purpose; label: string }> = [
  { id: 'work', label: 'Trabalho' },
  { id: 'personal', label: 'Pessoal' },
  { id: 'school', label: 'Escola' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const _HEIGHT = {
  card: 600,
  cardPadding: 32,
  greeting: 21,
  h1Line: 32,
  h1MarginBottom: 8,
  progressBar: 8,
  optionButton: 50,
  navButtonSecondary: 50,
  navButtonPrimary: 48,
  inputCompact: 36,
  inputLarge: 54,
  errorMsg: 16,
  termsParagraph: 20,
} as const;

const stepThreeSchema = z.object({
  name: z
    .string()
    .min(3, 'O nome deve ter pelo menos 3 caracteres')
    .max(80, 'Máximo 80 caracteres'),
  description: z.string().max(500, 'Máximo 500 caracteres').optional(),
});

type StepThreeFormData = z.infer<typeof stepThreeSchema>;

function parseEmails(raw: string): { valid: string[]; invalid: string[] } {
  const tokens = raw
    .split(/[,;\s\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const t of tokens) {
    if (EMAIL_REGEX.test(t)) valid.push(t.toLowerCase());
    else invalid.push(t);
  }
  return { valid, invalid };
}

export function WorkspaceWizard() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user } = useAuth();
  const setCurrentWorkspace = useWorkspaceStore((s) => s.setCurrentWorkspace);
  const createWorkspace = useCreateWorkspace();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [invitesRaw, setInvitesRaw] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const greetingName = user?.name?.split(' ')[0] ?? null;

  const form = useForm<StepThreeFormData>({
    resolver: zodResolver(stepThreeSchema),
    defaultValues: { name: '', description: '' },
    mode: 'onChange',
  });

  const { valid: validInvites, invalid: invalidInvites } = useMemo(
    () => parseEmails(invitesRaw),
    [invitesRaw],
  );

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  function goNext() {
    if (step < 3) setStep((s) => (s + 1) as 1 | 2 | 3);
  }
  function goBack() {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
  }

  async function handleFinish(data: StepThreeFormData) {
    setSubmitting(true);
    try {
      const workspace = await createWorkspace.mutateAsync({
        name: data.name,
        slug: toSlug(data.name),
      });

      // Falhas individuais NÃO abortam — user entra no workspace mesmo assim.
      let inviteFailures = 0;
      if (validInvites.length > 0) {
        const results = await Promise.allSettled(
          validInvites.map((email) =>
            workspaceService.createInvite(workspace.id, {
              email,
              role: 'MEMBER' as WorkspaceRole,
            }),
          ),
        );
        inviteFailures = results.filter((r) => r.status === 'rejected').length;
        const sent = results.length - inviteFailures;
        if (sent > 0) {
          toast.success(
            sent === 1 ? '1 convite enviado!' : `${sent} convites enviados!`,
          );
        }
        if (inviteFailures > 0) {
          toast.error(
            `${inviteFailures} convite(s) falharam — revise em Configurações.`,
          );
        }
      }

      setCurrentWorkspace(workspace);
      qc.clear();
      router.push('/inicio');
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <main className='flex min-h-screen items-center justify-center bg-bg-weak-50 p-4'>
      <div className='flex h-[min(100vh-2rem,600px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-bg-white-0 p-8 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200'>
        {greetingName && (
          <p className='mb-6 text-right text-paragraph-sm text-text-strong-950'>
            Que bom ter você aqui, {greetingName}!
          </p>
        )}

        <div className='flex flex-1 flex-col justify-center overflow-y-auto'>
          {step === 1 && (
            <section
              data-step='1'
              className='flex flex-col items-center gap-10'
              aria-labelledby='step1-title'
            >
              <h1
                id='step1-title'
                className='mb-2 max-w-md text-center text-title-h5 text-text-strong-950'
              >
                Para que você usará esse espaço de trabalho?
              </h1>

              <div
                className='grid w-full grid-cols-1 gap-4 px-2 sm:grid-cols-3 sm:px-8'
                role='radiogroup'
                aria-label='Propósito do workspace'
              >
                {PURPOSE_OPTIONS.map((opt) => {
                  const selected = purpose === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type='button'
                      role='radio'
                      aria-checked={selected}
                      onClick={() => {
                        setPurpose(opt.id);
                        setStep(2);
                      }}
                      className={
                        'inline-flex h-[50px] cursor-pointer items-center justify-center rounded-10 px-4 text-label-sm text-text-strong-950 shadow-regular-xs ring-1 ring-inset transition duration-200 ease-out hover:bg-bg-weak-50 focus-visible:shadow-button-important-focus focus-visible:outline-none ' +
                        (selected
                          ? 'bg-primary-alpha-10 ring-primary-base'
                          : 'bg-bg-white-0 ring-stroke-soft-200')
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <ProgressBar value={progress} />
            </section>
          )}

          {step === 2 && (
            <section
              data-step='2'
              className='flex flex-col items-center gap-10'
              aria-labelledby='step2-title'
            >
              <h1
                id='step2-title'
                className='mb-2 text-center text-title-h5 text-text-strong-950'
              >
                Convide pessoas para seu Espaço de trabalho:
              </h1>

              <div className='flex w-full flex-col gap-2'>
                <Input.Root>
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      value={invitesRaw}
                      onChange={(e) => setInvitesRaw(e.target.value)}
                      placeholder='Insira os endereços de e-mail (ou cole múltiplos)'
                      className='h-9'
                    />
                  </Input.Wrapper>
                </Input.Root>
                {(validInvites.length > 0 || invalidInvites.length > 0) && (
                  <div className='flex flex-wrap items-center gap-2 text-paragraph-xs'>
                    {validInvites.length > 0 && (
                      <span className='rounded-full bg-primary-alpha-10 px-2 py-0.5 text-primary-darker'>
                        {validInvites.length} válido(s)
                      </span>
                    )}
                    {invalidInvites.length > 0 && (
                      <span className='rounded-full bg-error-lighter px-2 py-0.5 text-error-base'>
                        {invalidInvites.length} inválido(s)
                      </span>
                    )}
                    <span className='text-text-sub-600'>
                      Separadores aceitos: vírgula, espaço, ponto-e-vírgula.
                    </span>
                  </div>
                )}
              </div>

              <ProgressBar value={progress} />

              <div className='flex w-full items-center justify-between'>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='medium'
                  onClick={goBack}
                  className='h-[50px] !rounded-10'
                >
                  <Button.Icon as={RiArrowLeftLine} />
                  Voltar
                </Button.Root>
                <Button.Root
                  type='button'
                  variant='primary'
                  mode='filled'
                  size='medium'
                  onClick={goNext}
                  className='h-[48px] !rounded-10'
                >
                  Próximo
                  <Button.Icon as={RiArrowRightLine} />
                </Button.Root>
              </div>
            </section>
          )}

          {step === 3 && (
            <form
              onSubmit={form.handleSubmit(handleFinish)}
              data-step='3'
              className='flex flex-col gap-6'
              aria-labelledby='step3-title'
              noValidate
            >
              <h1
                id='step3-title'
                className='mb-2 text-center text-title-h5 text-text-strong-950'
              >
                Por fim, qual nome você gostaria de dar ao seu Espaço de
                trabalho?
              </h1>

              <div className='flex flex-col gap-1'>
                <Input.Root hasError={!!form.formState.errors.name}>
                  <Input.Wrapper>
                    <Input.Input
                      type='text'
                      placeholder='Nome do workspace'
                      aria-invalid={!!form.formState.errors.name}
                      {...form.register('name')}
                      className='h-[54px]'
                    />
                  </Input.Wrapper>
                </Input.Root>
                {form.formState.errors.name && (
                  <Hint.Root hasError>
                    {form.formState.errors.name.message}
                  </Hint.Root>
                )}
              </div>

              <Textarea.Root
                placeholder='Descrição (opcional)'
                rows={2}
                {...form.register('description')}
                className='h-[54px] resize-none px-4 py-[15px]'
              />

              <p className='text-paragraph-sm text-text-strong-950'>
                Ao preencher este formulário, você concorda com nossos{' '}
                <a href='#' className='text-primary-base underline'>
                  termos de serviço
                </a>{' '}
                e{' '}
                <a href='#' className='text-primary-base underline'>
                  política de privacidade
                </a>
                .
              </p>

              <ProgressBar value={progress} />

              <div className='flex items-center justify-between'>
                <Button.Root
                  type='button'
                  variant='neutral'
                  mode='stroke'
                  size='medium'
                  onClick={goBack}
                  disabled={submitting}
                  className='h-[50px] !rounded-10'
                >
                  <Button.Icon as={RiArrowLeftLine} />
                  Voltar
                </Button.Root>
                <Button.Root
                  type='submit'
                  variant='primary'
                  mode='filled'
                  size='medium'
                  disabled={submitting || !form.formState.isValid}
                  className='ml-auto h-[48px] !rounded-10'
                >
                  {submitting ? (
                    <>
                      Criando
                      <Button.Icon as={RiLoader4Line} className='animate-spin' />
                    </>
                  ) : (
                    <>
                      Terminar
                      <Button.Icon as={RiSaveLine} />
                    </>
                  )}
                </Button.Root>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      role='progressbar'
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className='h-2 w-full overflow-hidden rounded-full bg-primary-alpha-10'
    >
      <div
        className='h-2 rounded-full bg-primary-base transition-all duration-300 ease-out'
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
