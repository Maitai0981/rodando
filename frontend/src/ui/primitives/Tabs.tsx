import MuiTab from '@mui/material/Tab'
import MuiTabs from '@mui/material/Tabs'
import type { TabsProps } from '../types'

export function Tabs({ items, value, onChange }: TabsProps) {
  return (
    <MuiTabs
      value={value}
      onChange={(_event, next) => onChange(String(next))}
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
      sx={{
        minHeight: 40,
        '& .MuiTabs-indicator': {
          height: 3,
          borderRadius: 3,
        },
      }}
    >
      {items.map((item) => (
        <MuiTab
          key={item.id}
          value={item.id}
          label={item.label}
          disabled={item.disabled}
          sx={{ minHeight: 40, textTransform: 'none', fontWeight: 600 }}
        />
      ))}
    </MuiTabs>
  )
}
