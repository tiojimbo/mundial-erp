'use client';

import { useState, useRef, useEffect } from 'react';
import {
  RiEmotionLine,
  RiReplyLine,
  RiMoreLine,
  RiCheckLine,
  RiPencilLine,
  RiDeleteBinLine,
} from '@remixicon/react';
import { useChatStore } from '@/stores/chat.store';
import { useAuth } from '@/providers/auth-provider';
import { useUpdateMessage, useDeleteMessage } from '../../hooks/use-messages';
import { useAddReaction } from '../../hooks/use-reactions';
import { EmojiPickerDropdown } from '../reactions/emoji-picker-dropdown';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import type { Message } from '../../types/chat.types';

type MessageItemProps = {
  message: Message;
  hideThreadPreview?: boolean;
};

export function MessageItem({ message, hideThreadPreview }: MessageItemProps) {
  const openThread = useChatStore((s) => s.openThread);
  const { user } = useAuth();
  const isAuthor = user?.id === message.author.id;

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const { mutate: updateMessage } = useUpdateMessage();
  const { mutate: deleteMessage } = useDeleteMessage();
  const { mutate: addReaction } = useAddReaction();

  const initials = message.author.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const time = new Date(message.createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isDeleted = !!message.content.match(/^\[deleted\]$/);

  // Focus textarea ao entrar em modo edicao
  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [isEditing]);

  // Fechar dropdown "mais" ao clicar fora
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMoreMenu]);

  // --- Handlers ---

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === message.content) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }
    updateMessage(
      { messageId: message.id, payload: { content: trimmed } },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleReaction = (emoji: string) => {
    addReaction({ messageId: message.id, emojiName: emoji });
  };

  const handleDelete = () => {
    setShowMoreMenu(false);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    deleteMessage(message.id);
    setShowDeleteModal(false);
  };


  return (
    <div className='group relative flex gap-3 px-4 py-1 transition-colors hover:bg-bg-weak-50/40'>
      {/* Avatar */}
      <div className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-base text-[12px] font-semibold text-white'>
        {initials}
      </div>

      {/* Content */}
      <div className='min-w-0 flex-1'>
        <div className='flex items-baseline gap-2'>
          <span className='text-label-sm font-semibold text-text-strong-950'>
            {message.author.name}
          </span>
          <span className='text-paragraph-xs text-text-soft-400'>
            {time}
          </span>
          {message.editedAt && (
            <span className='text-paragraph-xs text-text-soft-400'>
              (editado)
            </span>
          )}
          {message.resolved && (
            <span className='flex items-center gap-0.5 text-paragraph-xs text-success-base'>
              <RiCheckLine className='size-3' />
              Resolvido
            </span>
          )}
        </div>

        {/* Conteudo ou modo edicao */}
        {isEditing ? (
          <div className='mt-1'>
            <textarea
              ref={editRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className='w-full resize-none rounded-lg border border-stroke-soft-200 bg-bg-white-0 px-3 py-2 text-paragraph-sm text-text-strong-950 outline-none focus:border-primary-base/30 focus:shadow-regular-xs'
              rows={2}
            />
            <div className='mt-1 flex items-center gap-2'>
              <button
                type='button'
                onClick={handleSaveEdit}
                className='rounded-md bg-primary-base px-3 py-1 text-[12px] font-medium text-white transition-colors hover:opacity-90'
              >
                Salvar
              </button>
              <button
                type='button'
                onClick={handleCancelEdit}
                className='rounded-md px-3 py-1 text-[12px] font-medium text-text-soft-400 transition-colors hover:bg-bg-weak-50'
              >
                Cancelar
              </button>
              <span className='text-[11px] text-text-soft-400'>
                Enter para salvar, Esc para cancelar
              </span>
            </div>
          </div>
        ) : (
          <div
            className={`mt-0.5 text-paragraph-sm leading-relaxed ${
              isDeleted
                ? 'italic text-text-soft-400'
                : 'text-text-strong-950'
            }`}
          >
            {isDeleted ? message.content : renderMentions(message.content)}
          </div>
        )}

        {/* Thread preview banner — estilo ClickUp */}
        {message.replyCount > 0 && !message.parentMessageId && !hideThreadPreview && (
          <div className='relative mt-1 pl-4'>
            {/* Linha curva de conexao */}
            <div className='absolute left-0 top-0 h-4 w-4 rounded-bl-lg border-b border-l border-stroke-soft-200' />
          <button
            onClick={() => openThread(message.id)}
            className='mt-2 flex w-full max-w-[400px] items-center gap-2.5 rounded-lg border border-stroke-soft-200 px-3 py-2 transition-colors hover:bg-bg-weak-50'
          >
            {/* Avatar do autor (representando ultimo respondente) */}
            <div className='flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-base text-[9px] font-semibold text-white'>
              {initials}
            </div>
            {/* Contagem + texto */}
            <span className='text-[13px] font-medium text-primary-base'>
              {message.replyCount}{' '}
              {message.replyCount === 1 ? 'resposta' : 'respostas'}
            </span>
            <span className='text-[13px] text-text-soft-400'>
              Exibir conversa
            </span>
            {/* Seta */}
            <span className='ml-auto text-text-soft-400'>
              <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                <path d='m9 18 6-6-6-6' />
              </svg>
            </span>
          </button>
          </div>
        )}
      </div>

      {/* Hover actions */}
      {!isEditing && (
        <div className='absolute -top-3 right-4 hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-0.5 shadow-regular-xs group-hover:flex'>
          {/* Reagir */}
          <EmojiPickerDropdown onEmojiSelect={handleReaction}>
            <ActionButton
              icon={RiEmotionLine}
              title='Reagir'
              onClick={() => {}}
            />
          </EmojiPickerDropdown>

          {/* Responder */}
          <ActionButton
            icon={RiReplyLine}
            title='Responder'
            onClick={() => openThread(message.id)}
          />

          {/* Mais opcoes */}
          <div ref={moreRef} className='relative'>
            <ActionButton
              icon={RiMoreLine}
              title='Mais'
              onClick={() => setShowMoreMenu((prev) => !prev)}
            />
            {showMoreMenu && (
              <div className='absolute right-0 top-full z-50 mt-1 w-[180px] rounded-xl border border-stroke-soft-200 bg-bg-white-0 py-1 shadow-regular-md'>
                {/* Editar (somente autor) */}
                {isAuthor && (
                  <MoreMenuItem
                    icon={RiPencilLine}
                    label='Editar'
                    onClick={() => {
                      setEditContent(message.content);
                      setIsEditing(true);
                      setShowMoreMenu(false);
                    }}
                  />
                )}

                {/* Excluir (somente autor) */}
                {isAuthor && (
                  <MoreMenuItem
                    icon={RiDeleteBinLine}
                    label='Excluir'
                    onClick={handleDelete}
                    danger
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmacao de exclusao */}
      <Modal.Root open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <Modal.Content className='w-[480px] max-w-[480px]'>
          <div className='flex flex-col items-start px-6 pb-2 pt-6'>
            {/* Icone */}
            <div className='flex size-9 items-center justify-center rounded-[10px] bg-error-lighter'>
              <RiDeleteBinLine className='size-5 text-error-base' />
            </div>

            {/* Titulo */}
            <h2 className='mt-4 text-[16px] font-semibold text-text-strong-950'>
              Excluir mensagem
            </h2>

            {/* Descricao */}
            <p className='mt-1.5 text-[14px] leading-relaxed text-text-sub-600'>
              Tem certeza de que deseja excluir esta mensagem? Não será
              possível recuperá-la.
            </p>
          </div>

          {/* Preview da mensagem */}
          <div className='mx-6 mb-4 mt-3 rounded-xl bg-bg-weak-50 px-4 py-3'>
            <div className='flex items-center gap-2.5'>
              <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-base text-[11px] font-semibold text-white'>
                {initials}
              </div>
              <div className='flex items-baseline gap-2'>
                <span className='text-[14px] font-semibold text-text-strong-950'>
                  {message.author.name}
                </span>
                <span className='text-[12px] text-text-soft-400'>
                  {time}
                </span>
              </div>
            </div>
            <p className='mt-1.5 pl-[42px] text-[14px] leading-relaxed text-text-sub-600'>
              {message.content.length > 150
                ? message.content.substring(0, 150) + '...'
                : message.content}
            </p>
          </div>

          {/* Footer com botoes full-width */}
          <div className='flex gap-3 border-t border-stroke-soft-200 px-6 py-4'>
            <Button.Root
              type='button'
              variant='neutral'
              mode='stroke'
              size='medium'
              className='flex-1'
              onClick={() => setShowDeleteModal(false)}
            >
              Cancelar
            </Button.Root>
            <Button.Root
              type='button'
              variant='error'
              mode='filled'
              size='medium'
              className='flex-1'
              onClick={confirmDelete}
            >
              Excluir
            </Button.Root>
          </div>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
}

function renderMentions(text: string): React.ReactNode[] {
  const mentionRegex =
    /(@everyone|@followers|@assignees|@[\w\s]+?)(?=\s|$|[.,!?;:])/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const mention = match[0].trim();
    parts.push(
      <span
        key={`${match.index}-${mention}`}
        className='inline-flex items-center rounded bg-primary-base/10 px-1 py-0.5 text-[13px] font-medium text-primary-base'
      >
        {mention}
      </span>,
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function ActionButton({
  icon: Icon,
  title,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      title={title}
      className='flex size-7 items-center justify-center rounded-md text-text-soft-400 transition-colors hover:bg-bg-weak-50'
    >
      <Icon className='size-4' />
    </button>
  );
}

function MoreMenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-[13px] transition-colors hover:bg-bg-weak-50 ${
        danger ? 'text-error-base' : 'text-text-strong-950'
      }`}
    >
      <Icon className='size-4' />
      {label}
    </button>
  );
}
