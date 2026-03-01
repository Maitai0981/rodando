import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { ActionGuardDialog } from '../ActionGuardDialog'
import { renderWithProviders } from '../../../test/renderWithProviders'

describe('ActionGuardDialog', () => {
  it('exibe impactos e exige confirmação explícita', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()

    renderWithProviders(
      <ActionGuardDialog
        open
        title="Excluir item"
        description="Essa ação não pode ser desfeita."
        impacts={['Item sai da vitrine', 'Histórico permanece']}
        confirmLabel="Confirmar exclusão"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('• Item sai da vitrine')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
