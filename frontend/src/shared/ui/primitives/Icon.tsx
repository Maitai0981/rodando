import Box from '@mui/material/Box'
import type { BoxProps } from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'
import {
  ArrowClockwise,
  ArrowLeft,
  Bag,
  BoxSeam,
  Buildings,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  Envelope,
  Eye,
  EyeSlash,
  Facebook,
  Flag,
  GeoAlt,
  Grid,
  Headset,
  House,
  Instagram,
  Lightbulb,
  List,
  Lock,
  PatchCheck,
  Pencil,
  Person,
  Plus,
  Save,
  ShopWindow,
  Sliders,
  Tag,
  Trash,
  Truck,
  Whatsapp,
  X,
} from 'react-bootstrap-icons'
import type { Icon as BootstrapIconComponent } from 'react-bootstrap-icons'
import { dsTokens } from '../../design-system/tokens'

export type UiIconSize = 'sm' | 'md' | 'lg' | 'xl'
export type UiIconTone = 'default' | 'muted' | 'accent' | 'success' | 'warning' | 'danger' | 'inverse'

export interface UiIconProps extends Omit<BoxProps<'span'>, 'children'> {
  size?: UiIconSize
  tone?: UiIconTone
  decorative?: boolean
  title?: string
  fontSize?: 'inherit' | 'small' | 'medium' | 'large'
}

const iconSizeMap: Record<UiIconSize, number> = {
  sm: dsTokens.icon.sm,
  md: dsTokens.icon.md,
  lg: dsTokens.icon.lg,
  xl: 28,
}

const iconToneSxMap: Record<Exclude<UiIconTone, 'default'>, { color: string }> = {
  muted: { color: 'text.secondary' },
  accent: { color: 'primary.main' },
  success: { color: 'success.main' },
  warning: { color: 'warning.main' },
  danger: { color: 'error.main' },
  inverse: { color: '#FFFFFF' },
}

function resolveIconSize(size?: UiIconSize, fontSize?: UiIconProps['fontSize']) {
  if (size) return iconSizeMap[size]
  if (fontSize === 'small') return iconSizeMap.sm
  if (fontSize === 'large') return iconSizeMap.lg
  return iconSizeMap.md
}

const iconComponentMap = {
  MenuRoundedIcon: List,
  PersonOutlineRoundedIcon: Person,
  ShoppingBagOutlinedIcon: Bag,
  StorefrontRoundedIcon: ShopWindow,
  CloseRoundedIcon: X,
  LightbulbRoundedIcon: Lightbulb,
  ArrowBackRoundedIcon: ArrowLeft,
  FacebookRoundedIcon: Facebook,
  InstagramIcon: Instagram,
  PlaceRoundedIcon: GeoAlt,
  WhatsAppIcon: Whatsapp,
  FilterListRoundedIcon: Sliders,
  NavigateNextRoundedIcon: ChevronRight,
  ChevronLeftRoundedIcon: ChevronLeft,
  ChevronRightRoundedIcon: ChevronRight,
  VerifiedRoundedIcon: PatchCheck,
  LocalShippingRoundedIcon: Truck,
  SupportAgentRoundedIcon: Headset,
  CategoryRoundedIcon: Grid,
  AccessTimeRoundedIcon: Clock,
  SaveRoundedIcon: Save,
  Inventory2RoundedIcon: BoxSeam,
  AddRoundedIcon: Plus,
  EditRoundedIcon: Pencil,
  DeleteOutlineRoundedIcon: Trash,
  LocalOfferRoundedIcon: Tag,
  EmailOutlinedIcon: Envelope,
  LockOutlinedIcon: Lock,
  VisibilityIcon: Eye,
  VisibilityOffIcon: EyeSlash,
  PersonOutlinedIcon: Person,
  PinDropOutlinedIcon: GeoAlt,
  HomeOutlinedIcon: House,
  LocationCityOutlinedIcon: Buildings,
  FlagOutlinedIcon: Flag,
  HomeRoundedIcon: House,
  CheckCircleRoundedIcon: CheckCircle,
  ExpandLessRoundedIcon: ChevronUp,
  ExpandMoreRoundedIcon: ChevronDown,
  RadioButtonUncheckedRoundedIcon: Circle,
  ReplayRoundedIcon: ArrowClockwise,
} as const satisfies Record<string, BootstrapIconComponent>

export type UiIconName = keyof typeof iconComponentMap

function BootstrapSvgIcon({
  iconName,
  size = 'md',
  tone = 'default',
  decorative = true,
  title,
  fontSize,
  className,
  sx,
  ...props
}: UiIconProps & { iconName: UiIconName }) {
  const resolvedSize = resolveIconSize(size, fontSize)
  const toneSx = tone === 'default' ? undefined : iconToneSxMap[tone]
  const IconComponent = iconComponentMap[iconName]
  const sxParts = [
    {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '1em',
      height: '1em',
      flexShrink: 0,
      lineHeight: 1,
      fontSize: resolvedSize,
      userSelect: 'none',
      verticalAlign: 'middle',
      color: 'inherit',
    },
    toneSx,
    ...(Array.isArray(sx) ? sx : [sx]),
  ].filter(Boolean) as SxProps<Theme>

  const accessibilityProps = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': title || iconName, title: title || iconName }

  return (
    <Box
      component="span"
      className={className}
      data-icon-name={iconName}
      sx={sxParts}
      {...accessibilityProps}
      {...props}
    >
      <IconComponent size={resolvedSize} focusable={false} aria-hidden />
    </Box>
  )
}

function fromBootstrap(iconName: UiIconName) {
  return function UiIconAlias(props: UiIconProps) {
    return <BootstrapSvgIcon iconName={iconName} {...props} />
  }
}

export interface IconProps extends UiIconProps {
  name?: UiIconName
}

export function Icon({ name = 'StorefrontRoundedIcon', ...props }: IconProps) {
  return <BootstrapSvgIcon iconName={name} {...props} />
}

export const MenuRoundedIcon = fromBootstrap('MenuRoundedIcon')
export const PersonOutlineRoundedIcon = fromBootstrap('PersonOutlineRoundedIcon')
export const ShoppingBagOutlinedIcon = fromBootstrap('ShoppingBagOutlinedIcon')
export const StorefrontRoundedIcon = fromBootstrap('StorefrontRoundedIcon')
export const CloseRoundedIcon = fromBootstrap('CloseRoundedIcon')
export const LightbulbRoundedIcon = fromBootstrap('LightbulbRoundedIcon')
export const ArrowBackRoundedIcon = fromBootstrap('ArrowBackRoundedIcon')
export const FacebookRoundedIcon = fromBootstrap('FacebookRoundedIcon')
export const InstagramIcon = fromBootstrap('InstagramIcon')
export const PlaceRoundedIcon = fromBootstrap('PlaceRoundedIcon')
export const WhatsAppIcon = fromBootstrap('WhatsAppIcon')
export const FilterListRoundedIcon = fromBootstrap('FilterListRoundedIcon')
export const NavigateNextRoundedIcon = fromBootstrap('NavigateNextRoundedIcon')
export const ChevronLeftRoundedIcon = fromBootstrap('ChevronLeftRoundedIcon')
export const ChevronRightRoundedIcon = fromBootstrap('ChevronRightRoundedIcon')
export const VerifiedRoundedIcon = fromBootstrap('VerifiedRoundedIcon')
export const LocalShippingRoundedIcon = fromBootstrap('LocalShippingRoundedIcon')
export const SupportAgentRoundedIcon = fromBootstrap('SupportAgentRoundedIcon')
export const CategoryRoundedIcon = fromBootstrap('CategoryRoundedIcon')
export const AccessTimeRoundedIcon = fromBootstrap('AccessTimeRoundedIcon')
export const SaveRoundedIcon = fromBootstrap('SaveRoundedIcon')
export const Inventory2RoundedIcon = fromBootstrap('Inventory2RoundedIcon')
export const AddRoundedIcon = fromBootstrap('AddRoundedIcon')
export const EditRoundedIcon = fromBootstrap('EditRoundedIcon')
export const DeleteOutlineRoundedIcon = fromBootstrap('DeleteOutlineRoundedIcon')
export const LocalOfferRoundedIcon = fromBootstrap('LocalOfferRoundedIcon')
export const EmailOutlinedIcon = fromBootstrap('EmailOutlinedIcon')
export const LockOutlinedIcon = fromBootstrap('LockOutlinedIcon')
export const VisibilityIcon = fromBootstrap('VisibilityIcon')
export const VisibilityOffIcon = fromBootstrap('VisibilityOffIcon')
export const PersonOutlinedIcon = fromBootstrap('PersonOutlinedIcon')
export const PinDropOutlinedIcon = fromBootstrap('PinDropOutlinedIcon')
export const HomeOutlinedIcon = fromBootstrap('HomeOutlinedIcon')
export const LocationCityOutlinedIcon = fromBootstrap('LocationCityOutlinedIcon')
export const FlagOutlinedIcon = fromBootstrap('FlagOutlinedIcon')
export const HomeRoundedIcon = fromBootstrap('HomeRoundedIcon')
export const CheckCircleRoundedIcon = fromBootstrap('CheckCircleRoundedIcon')
export const ExpandLessRoundedIcon = fromBootstrap('ExpandLessRoundedIcon')
export const ExpandMoreRoundedIcon = fromBootstrap('ExpandMoreRoundedIcon')
export const RadioButtonUncheckedRoundedIcon = fromBootstrap('RadioButtonUncheckedRoundedIcon')
export const ReplayRoundedIcon = fromBootstrap('ReplayRoundedIcon')

export const NavHomeIcon = HomeRoundedIcon
export const NavCatalogIcon = CategoryRoundedIcon
export const NavBagIcon = ShoppingBagOutlinedIcon
export const NavAccountIcon = PersonOutlineRoundedIcon
