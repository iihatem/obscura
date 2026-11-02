import { describe, expect, it, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import Modal from './Modal'
import SegmentedControl from './SegmentedControl'
import ProgressBar from './ProgressBar'

beforeAll(() => {
  // jsdom has <dialog> but not its modal methods.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.removeAttribute('open') }
})

describe('Modal', () => {
  it('never closes on a backdrop click', () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Upload"><p>Body</p></Modal>)
    fireEvent.click(screen.getByRole('dialog', { hidden: true }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('routes Escape to onClose instead of closing on its own', () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Upload"><p>Body</p></Modal>)
    const dialog = screen.getByRole('dialog', { hidden: true })
    const cancel = new Event('cancel', { cancelable: true })
    dialog.dispatchEvent(cancel)
    expect(onClose).toHaveBeenCalledOnce()
    expect(cancel.defaultPrevented).toBe(true)
  })

  it('closes from the close button', () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose}><p>Body</p></Modal>)
    fireEvent.click(screen.getByRole('button', { name: 'Close', hidden: true }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('SegmentedControl', () => {
  function Harness() {
    const [v, setV] = useState<'a' | 'b' | 'c'>('a')
    return <SegmentedControl label="Pick" value={v} onChange={setV} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }, { value: 'c', label: 'C' }]} />
  }

  it('moves the selection with arrow keys and wraps', () => {
    render(<Harness />)
    fireEvent.keyDown(screen.getByRole('radio', { name: 'A' }), { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'B' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.keyDown(screen.getByRole('radio', { name: 'B' }), { key: 'ArrowLeft' })
    fireEvent.keyDown(screen.getByRole('radio', { name: 'A' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('radio', { name: 'C' }).getAttribute('aria-checked')).toBe('true')
  })
})

describe('ProgressBar', () => {
  it('clamps out-of-range values', () => {
    render(<ProgressBar value={1.7} label="Progress" />)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100')
  })
})
