import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ContextSetup from '../app/components/ContextSetup'
import { useSharedStateStore } from '../app/store/useSharedState'

describe('ContextSetup', () => {
  beforeEach(() => {
    useSharedStateStore.setState({
      systemContext: '',
      taskData: null,
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders the context setup card', () => {
    render(<ContextSetup />)
    expect(screen.getByText('Inizializzazione del Contesto')).toBeInTheDocument()
  })

  it('renders file input and textarea', () => {
    render(<ContextSetup />)
    expect(screen.getByLabelText('Carica file .txt')).toBeInTheDocument()
    expect(screen.getByLabelText('Oppure incolla il testo del contesto')).toBeInTheDocument()
  })

  it('renders a disabled save button when textarea is empty', () => {
    render(<ContextSetup />)
    const button = screen.getByRole('button', { name: 'Salva Contesto' })
    expect(button).toBeDisabled()
  })

  it('enables save button when text is entered', () => {
    render(<ContextSetup />)
    const textarea = screen.getByLabelText('Oppure incolla il testo del contesto')
    fireEvent.change(textarea, { target: { value: 'some context text' } })
    const button = screen.getByRole('button', { name: 'Salva Contesto' })
    expect(button).not.toBeDisabled()
  })

  it('calls setSystemContext with localContext when save button is clicked', () => {
    render(<ContextSetup />)
    const textarea = screen.getByLabelText('Oppure incolla il testo del contesto')
    fireEvent.change(textarea, { target: { value: 'my context' } })
    const button = screen.getByRole('button', { name: 'Salva Contesto' })
    fireEvent.click(button)
    expect(useSharedStateStore.getState().systemContext).toBe('my context')
  })

  it('updates textarea when user types', () => {
    render(<ContextSetup />)
    const textarea = screen.getByLabelText('Oppure incolla il testo del contesto')
    fireEvent.change(textarea, { target: { value: 'updated context' } })
    expect(textarea.value).toBe('updated context')
  })

  it('reads file content and populates textarea on file upload', () => {
    render(<ContextSetup />)
    const fileInput = screen.getByLabelText('Carica file .txt')

    const fileContent = 'File content from txt'
    const file = new File([fileContent], 'test.txt', { type: 'text/plain' })

    class MockFileReader {
      readAsText() {
        this.onload({ target: { result: fileContent } })
      }
    }
    vi.stubGlobal('FileReader', MockFileReader)

    fireEvent.change(fileInput, { target: { files: [file] } })

    const textarea = screen.getByLabelText('Oppure incolla il testo del contesto')
    expect(textarea.value).toBe(fileContent)
  })
})
