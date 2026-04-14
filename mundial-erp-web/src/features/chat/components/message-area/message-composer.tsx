'use client';

import { useState, useRef, useCallback } from 'react';
import {
  RiSendPlane2Fill,
  RiAtLine,
  RiAttachment2,
  RiMicLine,
  RiEmotionLine,
} from '@remixicon/react';
import { useSendMessage } from '../../hooks/use-messages';
import { EmojiPickerDropdown } from '../reactions/emoji-picker-dropdown';
import { getSocket } from '@/lib/socket';
import { MentionMenu } from './mention-menu';

type MessageComposerProps = {
  channelId: string;
  parentMessageId?: string;
};

export function MessageComposer({
  channelId,
  parentMessageId,
}: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mutate: sendMessage, isPending } = useSendMessage(channelId);
  const lastTypingRef = useRef(0);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || isPending) return;

    sendMessage(
      { content: trimmed, parentMessageId },
      {
        onSuccess: () => {
          setContent('');
          setMentionOpen(false);
          textareaRef.current?.focus();
        },
      },
    );
  }, [content, isPending, sendMessage, parentMessageId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Se menu de mencoes esta aberto, deixar o MentionMenu lidar com as teclas
    if (mentionOpen) {
      if (['ArrowDown', 'ArrowUp', 'Tab'].includes(e.key)) {
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        return;
      }
      if (e.key === 'Escape') {
        setMentionOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart ?? value.length;
    setContent(value);

    // Detectar @ para abrir menu de mencoes
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBeforeAt =
        lastAtIndex === 0 ? ' ' : textBeforeCursor[lastAtIndex - 1];
      // @ deve estar no inicio ou apos espaco/newline
      if (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) {
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        // Permitir queries com ate 30 chars (nomes compostos)
        if (query.length <= 30) {
          setMentionOpen(true);
          setMentionQuery(query);
          setMentionStartPos(lastAtIndex);
          return;
        }
      }
    }

    setMentionOpen(false);
    setMentionQuery('');
    setMentionStartPos(null);

    // Typing indicator
    const now = Date.now();
    if (now - lastTypingRef.current > 3000) {
      lastTypingRef.current = now;
      getSocket().emit('message:typing', { channelId });
    }
  };

  const handleMentionSelect = (mention: string) => {
    if (mentionStartPos === null) {
      // Ativado pelo botao @ — inserir no cursor atual
      const textarea = textareaRef.current;
      if (!textarea) return;
      const cursorPos = textarea.selectionStart ?? content.length;
      const before = content.substring(0, cursorPos);
      const after = content.substring(cursorPos);
      const needsSpace = before.length > 0 && !before.endsWith(' ');
      const newContent =
        before + (needsSpace ? ' ' : '') + mention + ' ' + after;
      setContent(newContent);
    } else {
      // Ativado digitando @ — substituir o @query pelo mention
      const before = content.substring(0, mentionStartPos);
      const afterQuery = content.substring(
        mentionStartPos + 1 + mentionQuery.length,
      );
      const newContent = before + mention + ' ' + afterQuery;
      setContent(newContent);
    }

    setMentionOpen(false);
    setMentionQuery('');
    setMentionStartPos(null);
    textareaRef.current?.focus();
  };

  const handleAtButtonClick = () => {
    setMentionQuery('');
    setMentionStartPos(null);
    setMentionOpen(true);
    textareaRef.current?.focus();
  };

  const handleEmojiInsert = (emoji: string) => {
    const textarea = textareaRef.current;
    const cursorPos = textarea?.selectionStart ?? content.length;
    const before = content.substring(0, cursorPos);
    const after = content.substring(cursorPos);
    setContent(before + emoji + after);
    textareaRef.current?.focus();
  };

  const hasText = content.trim().length > 0;

  return (
    <div className='relative shrink-0 px-4 pb-4 pt-2'>
      {/* Mention menu — posiciona acima do composer */}
      <MentionMenu
        channelId={channelId}
        query={mentionQuery}
        visible={mentionOpen}
        onSelect={handleMentionSelect}
        onClose={() => setMentionOpen(false)}
      />

      <div className='overflow-hidden rounded-[14px] border border-stroke-soft-200 bg-bg-white-0 transition-shadow focus-within:border-stroke-strong-950/20 focus-within:shadow-regular-xs'>
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder='Escreva uma mensagem...'
          rows={1}
          className='w-full resize-none bg-transparent px-4 py-3.5 text-paragraph-md text-text-strong-950 outline-none placeholder:text-text-soft-400/60'
          style={{ minHeight: 52 }}
        />

        {/* Toolbar */}
        <div className='flex items-center justify-between px-2 pb-2'>
          <div className='flex items-center'>
            <EmojiPickerDropdown onEmojiSelect={handleEmojiInsert}>
              <button
                type='button'
                title='Emoji'
                className='flex size-8 items-center justify-center rounded-[10px] text-[#8D8D8D] transition-colors hover:bg-bg-weak-50 hover:text-text-strong-950'
              >
                <RiEmotionLine className='size-[18px]' />
              </button>
            </EmojiPickerDropdown>
            <button
              type='button'
              title='Mencionar'
              onClick={handleAtButtonClick}
              className='flex size-8 items-center justify-center rounded-[10px] text-[#8D8D8D] transition-colors hover:bg-bg-weak-50 hover:text-text-strong-950'
            >
              <RiAtLine className='size-[18px]' />
            </button>
            <button
              type='button'
              title='Anexo'
              className='flex size-8 items-center justify-center rounded-[10px] text-[#8D8D8D] transition-colors hover:bg-bg-weak-50 hover:text-text-strong-950'
            >
              <RiAttachment2 className='size-[18px]' />
            </button>
            <button
              type='button'
              title='Gravar audio'
              className='flex size-8 items-center justify-center rounded-[10px] text-[#8D8D8D] transition-colors hover:bg-bg-weak-50 hover:text-text-strong-950'
            >
              <RiMicLine className='size-[18px]' />
            </button>
          </div>

          <button
            type='button'
            onClick={handleSend}
            disabled={!hasText || isPending}
            className={`flex size-9 items-center justify-center rounded-full transition-all ${
              hasText
                ? 'bg-primary-base text-white'
                : 'bg-bg-weak-50 text-text-soft-400'
            }`}
          >
            <RiSendPlane2Fill className='size-[18px]' />
          </button>
        </div>
      </div>
    </div>
  );
}
