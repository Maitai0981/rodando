import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon, NavCatalogIcon } from '../Icon'

describe('Icon primitive', () => {
  it('mantem identificador semantico e classe de Material Symbols', () => {
    render(<Icon data-testid="icon-base" name="HomeRoundedIcon" />)

    const icon = screen.getByTestId('icon-base')
    expect(icon).toHaveAttribute('data-icon-name', 'HomeRoundedIcon')
    expect(icon).toHaveAttribute('aria-hidden', 'true')
    expect(icon).toHaveClass('material-symbols-rounded')
  })

  it('permite tornar icone nao decorativo com titulo acessivel', () => {
    render(<Icon data-testid="icon-a11y" name="FilterListRoundedIcon" decorative={false} title="Filtro" />)

    const icon = screen.getByTestId('icon-a11y')
    expect(icon).not.toHaveAttribute('aria-hidden')
    expect(screen.getByTitle('Filtro')).toBeInTheDocument()
  })

  it('alias semantico de catalogo aponta para icone grid', () => {
    render(<NavCatalogIcon data-testid="nav-catalog-icon" />)

    expect(screen.getByTestId('nav-catalog-icon')).toHaveAttribute('data-icon-name', 'CategoryRoundedIcon')
  })
})
