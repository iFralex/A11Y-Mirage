import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import UserProfileOverride from '../app/components/UserProfileOverride'
import { useSharedStateStore, defaultUserProfile } from '../app/store/useSharedState'

// Radix Collapsible uses CSS animations; set height so jsdom shows content
vi.mock('@/components/ui/collapsible', () => {
  const { useState } = require('react')
  function Collapsible({ open, onOpenChange, children }) {
    return <div data-testid="collapsible" data-open={open}>{children}</div>
  }
  function CollapsibleTrigger({ asChild, children }) {
    return children
  }
  function CollapsibleContent({ children }) {
    return <div data-testid="collapsible-content">{children}</div>
  }
  return { Collapsible, CollapsibleTrigger, CollapsibleContent }
})

// Mock Select with native <select> for easy testing
vi.mock('@/components/ui/select', () => {
  function Select({ value, onValueChange, children }) {
    return (
      <div data-testid="select-root" data-value={value}>
        {/* Pass value and onValueChange to children via context-like hack */}
        {typeof children === 'function' ? children({ value, onValueChange }) : children}
        {/* Render a hidden native select for testing */}
        <select
          aria-hidden="true"
          data-testid={`native-select-${value}`}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        >
          {/* Options extracted from SelectItem children */}
        </select>
      </div>
    )
  }
  function SelectTrigger({ id, children }) {
    return <button id={id} type="button">{children}</button>
  }
  function SelectValue() { return null }
  function SelectContent({ children }) { return <div>{children}</div> }
  function SelectItem({ value, children }) { return <option value={value}>{children}</option> }
  function SelectLabel({ children }) { return <label>{children}</label> }
  function SelectSeparator() { return <hr /> }
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectLabel, SelectSeparator }
})

// Mock Switch
vi.mock('@/components/ui/switch', () => {
  function Switch({ id, checked, onCheckedChange }) {
    return (
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
      />
    )
  }
  return { Switch }
})

// Mock Slider
vi.mock('@/components/ui/slider', () => {
  function Slider({ value, onValueChange, min, max, step, 'aria-label': ariaLabel }) {
    return (
      <input
        type="range"
        aria-label={ariaLabel}
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onValueChange([Number(e.target.value)])}
      />
    )
  }
  return { Slider }
})

// Mock Label
vi.mock('@/components/ui/label', () => {
  function Label({ htmlFor, children, className }) {
    return <label htmlFor={htmlFor} className={className}>{children}</label>
  }
  return { Label }
})

describe('UserProfileOverride', () => {
  beforeEach(() => {
    useSharedStateStore.setState({
      userProfile: {
        ...defaultUserProfile,
        sensory: { ...defaultUserProfile.sensory },
        cognitive: { ...defaultUserProfile.cognitive },
        interaction: { ...defaultUserProfile.interaction },
      },
    })
  })

  it('renders the toggle button', () => {
    render(<UserProfileOverride />)
    expect(screen.getByRole('button', { name: /accessibility overrides/i })).toBeInTheDocument()
  })

  it('renders the collapsible panel', () => {
    render(<UserProfileOverride />)
    expect(screen.getByTestId('collapsible')).toBeInTheDocument()
    expect(screen.getByTestId('collapsible-content')).toBeInTheDocument()
  })

  it('renders safe-mode switch', () => {
    render(<UserProfileOverride />)
    expect(screen.getByRole('switch', { name: /safe mode/i })).toBeInTheDocument()
  })

  it('renders decision support switch', () => {
    render(<UserProfileOverride />)
    expect(screen.getByRole('switch', { name: /decision support/i })).toBeInTheDocument()
  })

  it('renders progressive disclosure switch', () => {
    render(<UserProfileOverride />)
    expect(screen.getByRole('switch', { name: /progressive disclosure/i })).toBeInTheDocument()
  })

  it('renders max inputs slider', () => {
    render(<UserProfileOverride />)
    expect(screen.getByRole('slider', { name: /max inputs per step/i })).toBeInTheDocument()
  })

  it('toggling safe-mode switch calls updateUserProfile with safeMode: true', () => {
    render(<UserProfileOverride />)
    const safeModeSwitch = screen.getByRole('switch', { name: /safe mode/i })
    fireEvent.click(safeModeSwitch)
    const profile = useSharedStateStore.getState().userProfile
    expect(profile.cognitive.safeMode).toBe(true)
  })

  it('toggling decision support switch calls updateUserProfile with requiresDecisionSupport: true', () => {
    render(<UserProfileOverride />)
    const decisionSwitch = screen.getByRole('switch', { name: /decision support/i })
    fireEvent.click(decisionSwitch)
    const profile = useSharedStateStore.getState().userProfile
    expect(profile.cognitive.requiresDecisionSupport).toBe(true)
  })

  it('toggling progressive disclosure switch calls updateUserProfile with progressiveDisclosure: true', () => {
    render(<UserProfileOverride />)
    const pdSwitch = screen.getByRole('switch', { name: /progressive disclosure/i })
    fireEvent.click(pdSwitch)
    const profile = useSharedStateStore.getState().userProfile
    expect(profile.interaction.progressiveDisclosure).toBe(true)
  })

  it('changing the slider updates maxInputsPerStep', () => {
    render(<UserProfileOverride />)
    const slider = screen.getByRole('slider', { name: /max inputs per step/i })
    fireEvent.change(slider, { target: { value: '5' } })
    const profile = useSharedStateStore.getState().userProfile
    expect(profile.cognitive.maxInputsPerStep).toBe(5)
  })

  it('setting slider to max (10) sets maxInputsPerStep to null (unlimited)', () => {
    render(<UserProfileOverride />)
    const slider = screen.getByRole('slider', { name: /max inputs per step/i })
    fireEvent.change(slider, { target: { value: '10' } })
    const profile = useSharedStateStore.getState().userProfile
    expect(profile.cognitive.maxInputsPerStep).toBeNull()
  })

  it('the panel is rendered outside the main workflow container (fixed position)', () => {
    const { container } = render(<UserProfileOverride />)
    const panel = container.firstChild
    expect(panel.className).toContain('fixed')
  })
})
