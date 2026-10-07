import type { ReactNode } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import {
  type AppTheme,
  type MotionPreference,
  type UiDensity,
  useUiStore,
} from '@/stores/ui.store'

import './SettingsPage.css'

export function SettingsPage() {
  const density = useUiStore((state) => state.density)
  const motionPreference = useUiStore((state) => state.motionPreference)
  const theme = useUiStore((state) => state.theme)
  const setDensity = useUiStore((state) => state.setDensity)
  const setMotionPreference = useUiStore((state) => state.setMotionPreference)
  const setTheme = useUiStore((state) => state.setTheme)

  return (
    <div className="page settings-page">
      <PageHeader eyebrow="Nekotify" title="Settings" />

      <section className="settings-section">
        <h2>Appearance</h2>
        <div className="settings-section__rows">
          <SettingRow title="Theme">
            <ChoiceGroup<AppTheme>
              value={theme}
              onChange={setTheme}
              options={[
                ['oled', 'OLED'],
                ['ambience', 'Ambience'],
              ]}
            />
          </SettingRow>

          <SettingRow title="Density">
            <ChoiceGroup<UiDensity>
              value={density}
              onChange={setDensity}
              options={[
                ['comfortable', 'Comfortable'],
                ['compact', 'Compact'],
              ]}
            />
          </SettingRow>

          <SettingRow title="Motion">
            <ChoiceGroup<MotionPreference>
              value={motionPreference}
              onChange={setMotionPreference}
              options={[
                ['system', 'System'],
                ['reduced', 'Reduced'],
              ]}
            />
          </SettingRow>
        </div>
      </section>

      <section className="settings-section">
        <h2>About</h2>
        <div className="settings-section__rows">
          <SettingRow title="Version">
            <span className="settings-version">0.1.0</span>
          </SettingRow>
        </div>
      </section>
    </div>
  )
}

function SettingRow({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="setting-row">
      <strong>{title}</strong>
      <div className="setting-row__control">{children}</div>
    </div>
  )
}

interface ChoiceGroupProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Array<readonly [T, string]>
}

function ChoiceGroup<T extends string>({
  value,
  onChange,
  options,
}: ChoiceGroupProps<T>) {
  return (
    <div className="choice-group">
      {options.map(([optionValue, label]) => (
        <button
          key={optionValue}
          type="button"
          className={
            optionValue === value
              ? 'choice-group__option choice-group__option--active'
              : 'choice-group__option'
          }
          aria-pressed={optionValue === value}
          onClick={() => onChange(optionValue)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
