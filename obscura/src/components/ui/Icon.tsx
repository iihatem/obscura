import {
  ArrowLeft, ArrowRight, BadgeCheck, ChevronRight, ExternalLink, BookOpen, BookPlus, Brain, Check, CircleAlert, CircleCheck, CircleHelp,
  Clock, CloudOff, CloudUpload, CreditCard, Eye, EyeOff, FileText, FileUp, FolderX, GraduationCap, Images,
  KeyRound, Layers, Lightbulb, Link, ListChecks, LoaderCircle, MailCheck, EllipsisVertical, Pencil, Play,
  Plus, RefreshCw, RotateCcw, ScrollText, Search, SearchX, Siren, Sparkles, Star, Tag, Trash2, TrendingUp,
  User, UserCog, Users, X, Zap, type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Lucide icons looked up by the Material Symbols names the screens used before
 * the redesign. New code imports from lucide-react directly; screens move off
 * this map as they're redesigned.
 */
const ICONS: Record<string, LucideIcon> = {
  add: Plus,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  auto_awesome: Sparkles,
  auto_stories: BookOpen,
  bolt: Zap,
  check: Check,
  check_circle: CircleCheck,
  chevron_right: ChevronRight,
  close: X,
  cloud_off: CloudOff,
  cloud_upload: CloudUpload,
  delete: Trash2,
  edit: Pencil,
  emergency_home: Siren,
  error: CircleAlert,
  folder_off: FolderX,
  group: Users,
  help: CircleHelp,
  history_edu: ScrollText,
  image: Images,
  insights: TrendingUp,
  key: KeyRound,
  label_off: Tag,
  layers: Layers,
  library_add: BookPlus,
  lightbulb: Lightbulb,
  link: Link,
  manage_accounts: UserCog,
  mark_email_read: MailCheck,
  more_vert: EllipsisVertical,
  open_in_new: ExternalLink,
  payments: CreditCard,
  pending_actions: Clock,
  person: User,
  picture_as_pdf: FileText,
  play_arrow: Play,
  progress_activity: LoaderCircle,
  psychology: Brain,
  psychology_off: Brain,
  public_off: EyeOff,
  quiz: ListChecks,
  replay: RotateCcw,
  schedule: Clock,
  school: GraduationCap,
  search: Search,
  search_off: SearchX,
  sell: Tag,
  star: Star,
  style: Layers,
  sync: RefreshCw,
  upload_file: FileUp,
  verified: BadgeCheck,
  visibility: Eye,
  vpn_key: KeyRound,
}

interface IconProps {
  name: string
  size?: number
  filled?: boolean
  className?: string
  style?: React.CSSProperties
}

export default function Icon({ name, size = 20, filled, className, style }: IconProps) {
  const Cmp = ICONS[name] ?? CircleHelp
  return (
    <Cmp
      aria-hidden
      width={size}
      height={size}
      className={cn('inline-block shrink-0', name === 'progress_activity' && 'animate-spin', className)}
      fill={filled ? 'currentColor' : 'none'}
      style={style}
    />
  )
}

export const knownIcons = Object.keys(ICONS)
