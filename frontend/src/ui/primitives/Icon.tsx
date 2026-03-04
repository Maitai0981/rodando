import Box from '@mui/material/Box'
import type { BoxProps } from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'
import 'material-symbols/rounded.css'
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

const iconLigatureMap = {
  MenuRoundedIcon: 'menu',
  PersonOutlineRoundedIcon: 'person',
  ShoppingBagOutlinedIcon: 'shopping_bag',
  StorefrontRoundedIcon: 'storefront',
  CloseRoundedIcon: 'close',
  LightbulbRoundedIcon: 'lightbulb',
  ArrowBackRoundedIcon: 'arrow_back',
  FacebookRoundedIcon: 'thumb_up',
  InstagramIcon: 'photo_camera',
  PlaceRoundedIcon: 'place',
  WhatsAppIcon: 'chat',
  FilterListRoundedIcon: 'tune',
  NavigateNextRoundedIcon: 'navigate_next',
  ChevronLeftRoundedIcon: 'chevron_left',
  ChevronRightRoundedIcon: 'chevron_right',
  VerifiedRoundedIcon: 'verified',
  LocalShippingRoundedIcon: 'local_shipping',
  SupportAgentRoundedIcon: 'support_agent',
  CategoryRoundedIcon: 'grid_view',
  AccessTimeRoundedIcon: 'schedule',
  SaveRoundedIcon: 'save',
  Inventory2RoundedIcon: 'inventory_2',
  AddRoundedIcon: 'add',
  EditRoundedIcon: 'edit',
  DeleteOutlineRoundedIcon: 'delete_outline',
  LocalOfferRoundedIcon: 'local_offer',
  EmailOutlinedIcon: 'mail',
  LockOutlinedIcon: 'lock',
  VisibilityIcon: 'visibility',
  VisibilityOffIcon: 'visibility_off',
  PersonOutlinedIcon: 'person',
  PinDropOutlinedIcon: 'pin_drop',
  HomeOutlinedIcon: 'home',
  LocationCityOutlinedIcon: 'location_city',
  FlagOutlinedIcon: 'flag',
  HomeRoundedIcon: 'home',
  CheckCircleRoundedIcon: 'check_circle',
  ExpandLessRoundedIcon: 'expand_less',
  ExpandMoreRoundedIcon: 'expand_more',
  RadioButtonUncheckedRoundedIcon: 'radio_button_unchecked',
  ReplayRoundedIcon: 'replay',
} as const

export type UiIconName = keyof typeof iconLigatureMap

function MaterialSymbolIcon({
  ligature,
  iconName,
  size = 'md',
  tone = 'default',
  decorative = true,
  title,
  fontSize,
  className,
  sx,
  ...props
}: UiIconProps & { ligature: string; iconName: UiIconName }) {
  const resolvedSize = resolveIconSize(size, fontSize)
  const toneSx = tone === 'default' ? undefined : iconToneSxMap[tone]
  const classNames = ['material-symbols-rounded', className].filter(Boolean).join(' ')
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
      fontVariationSettings: "'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24",
      userSelect: 'none',
      verticalAlign: 'middle',
      color: 'inherit',
    },
    toneSx,
    ...(Array.isArray(sx) ? sx : [sx]),
  ].filter(Boolean) as SxProps<Theme>

  const accessibilityProps = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': title || iconName }

  return (
    <Box
      component="span"
      className={classNames}
      data-icon-name={iconName}
      title={!decorative ? title : undefined}
      sx={sxParts}
      {...accessibilityProps}
      {...props}
    >
      {ligature}
    </Box>
  )
}

function fromMaterial(iconName: UiIconName) {
  return function UiIconAlias(props: UiIconProps) {
    return <MaterialSymbolIcon ligature={iconLigatureMap[iconName]} iconName={iconName} {...props} />
  }
}

export interface IconProps extends UiIconProps {
  name?: UiIconName
}

export function Icon({ name = 'StorefrontRoundedIcon', ...props }: IconProps) {
  return <MaterialSymbolIcon ligature={iconLigatureMap[name]} iconName={name} {...props} />
}

export const MenuRoundedIcon = fromMaterial('MenuRoundedIcon')
export const PersonOutlineRoundedIcon = fromMaterial('PersonOutlineRoundedIcon')
export const ShoppingBagOutlinedIcon = fromMaterial('ShoppingBagOutlinedIcon')
export const StorefrontRoundedIcon = fromMaterial('StorefrontRoundedIcon')
export const CloseRoundedIcon = fromMaterial('CloseRoundedIcon')
export const LightbulbRoundedIcon = fromMaterial('LightbulbRoundedIcon')
export const ArrowBackRoundedIcon = fromMaterial('ArrowBackRoundedIcon')
export const FacebookRoundedIcon = fromMaterial('FacebookRoundedIcon')
export const InstagramIcon = fromMaterial('InstagramIcon')
export const PlaceRoundedIcon = fromMaterial('PlaceRoundedIcon')
export const WhatsAppIcon = fromMaterial('WhatsAppIcon')
export const FilterListRoundedIcon = fromMaterial('FilterListRoundedIcon')
export const NavigateNextRoundedIcon = fromMaterial('NavigateNextRoundedIcon')
export const ChevronLeftRoundedIcon = fromMaterial('ChevronLeftRoundedIcon')
export const ChevronRightRoundedIcon = fromMaterial('ChevronRightRoundedIcon')
export const VerifiedRoundedIcon = fromMaterial('VerifiedRoundedIcon')
export const LocalShippingRoundedIcon = fromMaterial('LocalShippingRoundedIcon')
export const SupportAgentRoundedIcon = fromMaterial('SupportAgentRoundedIcon')
export const CategoryRoundedIcon = fromMaterial('CategoryRoundedIcon')
export const AccessTimeRoundedIcon = fromMaterial('AccessTimeRoundedIcon')
export const SaveRoundedIcon = fromMaterial('SaveRoundedIcon')
export const Inventory2RoundedIcon = fromMaterial('Inventory2RoundedIcon')
export const AddRoundedIcon = fromMaterial('AddRoundedIcon')
export const EditRoundedIcon = fromMaterial('EditRoundedIcon')
export const DeleteOutlineRoundedIcon = fromMaterial('DeleteOutlineRoundedIcon')
export const LocalOfferRoundedIcon = fromMaterial('LocalOfferRoundedIcon')
export const EmailOutlinedIcon = fromMaterial('EmailOutlinedIcon')
export const LockOutlinedIcon = fromMaterial('LockOutlinedIcon')
export const VisibilityIcon = fromMaterial('VisibilityIcon')
export const VisibilityOffIcon = fromMaterial('VisibilityOffIcon')
export const PersonOutlinedIcon = fromMaterial('PersonOutlinedIcon')
export const PinDropOutlinedIcon = fromMaterial('PinDropOutlinedIcon')
export const HomeOutlinedIcon = fromMaterial('HomeOutlinedIcon')
export const LocationCityOutlinedIcon = fromMaterial('LocationCityOutlinedIcon')
export const FlagOutlinedIcon = fromMaterial('FlagOutlinedIcon')
export const HomeRoundedIcon = fromMaterial('HomeRoundedIcon')
export const CheckCircleRoundedIcon = fromMaterial('CheckCircleRoundedIcon')
export const ExpandLessRoundedIcon = fromMaterial('ExpandLessRoundedIcon')
export const ExpandMoreRoundedIcon = fromMaterial('ExpandMoreRoundedIcon')
export const RadioButtonUncheckedRoundedIcon = fromMaterial('RadioButtonUncheckedRoundedIcon')
export const ReplayRoundedIcon = fromMaterial('ReplayRoundedIcon')

export const NavHomeIcon = HomeRoundedIcon
export const NavCatalogIcon = CategoryRoundedIcon
export const NavBagIcon = ShoppingBagOutlinedIcon
export const NavAccountIcon = PersonOutlineRoundedIcon
