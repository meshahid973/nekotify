import { MonitorCog, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import {
  type MotionPreference,
  type UiDensity,
  useUiStore,
} from '@/stores/ui.store'

import './SettingsPage.css'

export function SettingsPage() {
  const density = useUiStore((state) => state.density)
  const motionPreference = useUiStore((state) => state.motionPreference)
  const setDensity = useUiStore((state) => state.setDensity)
  const setMotionPreference = useUiStore((state) => state.setMotionPreference)

  return (
    <div className="page settings-page">
      <PageHeader
        eyebrow="Nekotify"
        title="settings"
        description="A small set of controls for things that already work."
      />

      <SettingsSection
        icon={<Sparkles size={17} />}
        title="Appearance"
        description="Keep the interface dense and quiet, or give it a little more room."
      >
        <SettingRow
          title="Interface density"
          description="Compact fits more library tiles without changing the information shown."
        >
          <ChoiceGroup<UiDensity>
            value={density}
            onChange={setDensity}
            options={[
              ['comfortable', 'Comfortable'],
              ['compact', 'Compact'],
            ]}
          />
        </SettingRow>

        <SettingRow
          title="Motion"
          description="Follow the operating system or force reduced interface movement."
        >
          <ChoiceGroup<MotionPreference>
            value={motionPreference}
            onChange={setMotionPreference}
            options={[
              ['system', 'System'],
              ['reduced', 'Reduced'],
            ]}
          />
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        icon={<MonitorCog size={17} />}
        title="Application"
        description="Desktop foundation information."
      >
        <SettingRow
          title="Nekotify"
          description="Lightweight local-first desktop music player."
        >
          <span className="settings-version">v0.1.0</span>
        </SettingRow>
      </SettingsSection>
    </div>
  )
}

interface SettingsSectionProps {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}

function SettingsSection({
  icon,
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <section className="settings-section">
      <div className="settings-section__heading">
        <span className="settings-section__icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="settings-section__rows">{children}</div>
    </section>
  )
}

interface SettingRowProps {
  title: string
  description: string
  children: ReactNode
}

function SettingRow({ title, description, children }: SettingRowProps) {
  return (
    <div className="setting-row">
      <div className="setting-row__copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
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
