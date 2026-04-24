'use client';

import { useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import {
  AtSign,
  BadgeCheck,
  Bell,
  Bookmark,
  Briefcase,
  Building,
  Calendar,
  Camera,
  CircleAlert,
  CircleCheck,
  CircleCheckBig,
  CircleDot,
  CircleHelp,
  CircleMinus,
  CirclePlus,
  CircleX,
  Circle,
  Clock,
  Contact,
  Crown,
  Diamond,
  Eye,
  EyeOff,
  File,
  FileCheck,
  FilePlus,
  FileText,
  Flag,
  Flame,
  Folder,
  Globe,
  Hash,
  Heart,
  HeartPulse,
  Hexagon,
  Image as ImageIcon,
  Info,
  Key,
  Landmark,
  Lightbulb,
  Link as LinkIcon,
  ListTodo,
  Lock,
  LockOpen,
  Mail,
  MapPin,
  Medal,
  Megaphone,
  MessageCircle,
  Music,
  Newspaper,
  NotebookText,
  Paperclip,
  Phone,
  Rocket,
  ScrollText,
  Search,
  Send,
  Shield,
  Sparkles,
  Square,
  SquareCheckBig,
  Star,
  Store,
  Tag,
  Target,
  ToggleLeft,
  ToggleRight,
  Triangle,
  TriangleAlert,
  Trophy,
  User,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  Video,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';

export type IconEntry = { name: string; Icon: LucideIcon };

export const AVAILABLE_ICONS: IconEntry[] = [
  { name: 'CircleDot', Icon: CircleDot },
  { name: 'Diamond', Icon: Diamond },
  { name: 'Flag', Icon: Flag },
  { name: 'Bookmark', Icon: Bookmark },
  { name: 'Zap', Icon: Zap },
  { name: 'Target', Icon: Target },
  { name: 'Hexagon', Icon: Hexagon },
  { name: 'Triangle', Icon: Triangle },
  { name: 'Square', Icon: Square },
  { name: 'Circle', Icon: Circle },
  { name: 'Star', Icon: Star },
  { name: 'Rocket', Icon: Rocket },
  { name: 'ToggleRight', Icon: ToggleRight },
  { name: 'ToggleLeft', Icon: ToggleLeft },
  { name: 'Megaphone', Icon: Megaphone },
  { name: 'File', Icon: File },
  { name: 'FileText', Icon: FileText },
  { name: 'FileCheck', Icon: FileCheck },
  { name: 'FilePlus', Icon: FilePlus },
  { name: 'ScrollText', Icon: ScrollText },
  { name: 'Newspaper', Icon: Newspaper },
  { name: 'NotebookText', Icon: NotebookText },
  { name: 'User', Icon: User },
  { name: 'Users', Icon: Users },
  { name: 'UserCheck', Icon: UserCheck },
  { name: 'UserPlus', Icon: UserPlus },
  { name: 'UsersRound', Icon: UsersRound },
  { name: 'Contact', Icon: Contact },
  { name: 'Briefcase', Icon: Briefcase },
  { name: 'Building', Icon: Building },
  { name: 'Store', Icon: Store },
  { name: 'Landmark', Icon: Landmark },
  { name: 'Folder', Icon: Folder },
  { name: 'Calendar', Icon: Calendar },
  { name: 'Clock', Icon: Clock },
  { name: 'CircleCheckBig', Icon: CircleCheckBig },
  { name: 'CircleCheck', Icon: CircleCheck },
  { name: 'SquareCheckBig', Icon: SquareCheckBig },
  { name: 'BadgeCheck', Icon: BadgeCheck },
  { name: 'ListTodo', Icon: ListTodo },
  { name: 'CircleAlert', Icon: CircleAlert },
  { name: 'TriangleAlert', Icon: TriangleAlert },
  { name: 'CircleX', Icon: CircleX },
  { name: 'CircleMinus', Icon: CircleMinus },
  { name: 'CirclePlus', Icon: CirclePlus },
  { name: 'Info', Icon: Info },
  { name: 'CircleHelp', Icon: CircleHelp },
  { name: 'Bell', Icon: Bell },
  { name: 'Heart', Icon: Heart },
  { name: 'HeartPulse', Icon: HeartPulse },
  { name: 'Shield', Icon: Shield },
  { name: 'Lock', Icon: Lock },
  { name: 'LockOpen', Icon: LockOpen },
  { name: 'Key', Icon: Key },
  { name: 'Eye', Icon: Eye },
  { name: 'EyeOff', Icon: EyeOff },
  { name: 'Globe', Icon: Globe },
  { name: 'MapPin', Icon: MapPin },
  { name: 'Phone', Icon: Phone },
  { name: 'Mail', Icon: Mail },
  { name: 'MessageCircle', Icon: MessageCircle },
  { name: 'Send', Icon: Send },
  { name: 'Link', Icon: LinkIcon },
  { name: 'Paperclip', Icon: Paperclip },
  { name: 'Image', Icon: ImageIcon },
  { name: 'Camera', Icon: Camera },
  { name: 'Video', Icon: Video },
  { name: 'Music', Icon: Music },
  { name: 'Hash', Icon: Hash },
  { name: 'AtSign', Icon: AtSign },
  { name: 'Tag', Icon: Tag },
  { name: 'Sparkles', Icon: Sparkles },
  { name: 'Lightbulb', Icon: Lightbulb },
  { name: 'Flame', Icon: Flame },
  { name: 'Crown', Icon: Crown },
  { name: 'Trophy', Icon: Trophy },
  { name: 'Medal', Icon: Medal },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  AVAILABLE_ICONS.map((entry) => [entry.name, entry.Icon]),
);

export function getIconByName(name?: string | null): LucideIcon {
  if (name && ICON_MAP[name]) return ICON_MAP[name];
  return CircleDot;
}

type Props = {
  value?: string;
  onChange: (name: string) => void;
};

export function IconPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return AVAILABLE_ICONS;
    return AVAILABLE_ICONS.filter((entry) =>
      entry.name.toLowerCase().includes(term),
    );
  }, [search]);

  const SelectedIcon = getIconByName(value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type='button'
          className='flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
          aria-label='Selecionar icone'
        >
          <SelectedIcon className='h-4 w-4' />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align='start'
          sideOffset={4}
          className='z-[70] w-[360px] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md'
        >
          <div className='border-b border-border p-2'>
            <div className='flex items-center gap-2 rounded-md border border-border px-2'>
              <Search
                className='h-3.5 w-3.5 text-muted-foreground'
                aria-hidden
              />
              <input
                autoFocus
                placeholder='Search...'
                className='h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className='max-h-[280px] overflow-y-auto p-2'>
            {filtered.length === 0 ? (
              <div className='py-6 text-center text-xs text-muted-foreground'>
                Nenhum icone encontrado.
              </div>
            ) : (
              <div className='grid grid-cols-8 gap-0.5'>
                {filtered.map(({ name, Icon }) => {
                  const selected = value === name;
                  return (
                    <button
                      key={name}
                      type='button'
                      onClick={() => {
                        onChange(name);
                        setOpen(false);
                      }}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-accent',
                        selected && 'bg-accent text-foreground ring-1 ring-primary',
                      )}
                      aria-label={name}
                    >
                      <Icon className='h-4 w-4' />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
