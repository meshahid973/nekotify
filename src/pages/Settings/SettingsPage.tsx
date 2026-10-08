import { Check, FolderPlus, ImagePlus, Moon, Sparkles, X } from 'lucide-react'
import type { ReactNode } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/primitives/Button'
import { useLibraryStore } from '@/features/library/library.store'
import { usePlaybackStore } from '@/features/playback/playback.store'
import {
  type AppTheme,
  type MotionPreference,
  type UiDensity,
  useUiStore,
} from '@/stores/ui.store'

import './SettingsPage.css'

export function SettingsPage() {
  const artwork = usePlaybackStore((state) => state.track?.artwork?.uri)
  const density = useUiStore((state) => state.density)
  const motionPreference = useUiStore((state) => state.motionPreference)
  const theme = useUiStore((state) => state.theme)
  const setDensity = useUiStore((state) => state.setDensity)
  const setMotionPreference = useUiStore((state) => state.setMotionPreference)
  const setTheme = useUiStore((state) => state.setTheme)

  const artSources = useLibraryStore((state) => state.artSources)
  const artworkPool = useLibraryStore((state) => state.artworkPool)
  const status = useLibraryStore((state) => state.status)
  const importArtFolder = useLibraryStore((state) => state.importArtFolder)
  const importArtFile = useLibraryStore((state) => state.importArtFile)
  const removeArtSource = useLibraryStore((state) => state.removeArtSource)
  const busy = status === 'loading'
  const reshuffleFallbacks = useLibraryStore((state) => state.reshuffleFallbacks)

  return (
    <div className="page settings-page">
      <PageHeader eyebrow="MAKE IT YOURS" title="Settings"
        description="A few things, exactly how you like them." />

      <section className="settings-section">
        <h2>Appearance</h2>
        <div className="settings-section__rows">
          <SettingRow title="Theme">
            <ThemeSelector value={theme} artwork={artwork} onChange={setTheme}/>
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
        <h2>Artwork</h2>
        <div className="settings-section__rows">
          <SettingRow title="Fallback covers">
            <Button variant="secondary" size="sm" onClick={reshuffleFallbacks}
              disabled={!artworkPool.length}>Reshuffle</Button>
          </SettingRow>
          <SettingRow title="Sources">
            <div className="settings-actions">
              <span>{artworkPool.length} images</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void importArtFolder()}
              >
                <FolderPlus size={14} aria-hidden="true" />
                Folder
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void importArtFile()}
              >
                <ImagePlus size={14} aria-hidden="true" />
                Image
              </Button>
            </div>
          </SettingRow>

          {artSources.map((source) => (
            <SettingRow key={source.path} title={source.name}>
              <button
                type="button"
                className="settings-remove"
                aria-label={'Remove ' + source.name}
                disabled={busy}
                onClick={() => void removeArtSource(source.path)}
              >
                <X size={14} />
              </button>
            </SettingRow>
          ))}
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

function ThemeSelector({
  value, artwork, onChange,
}: { value: AppTheme; artwork?: string; onChange: (value: AppTheme) => void }) {
  return (
    <div className="theme-selector" role="group" aria-label="Application theme">
      <button type="button" className="theme-selector__choice" aria-pressed={value === 'oled'}
        onClick={() => onChange('oled')}>
        <span className="theme-selector__preview theme-selector__preview--oled">
          <Moon size={23} aria-hidden="true"/>
          <span className="theme-selector__check">{value === 'oled' ? <Check size={14}/> : null}</span>
        </span>
        <span className="theme-selector__description"><strong>OLED</strong><small>Pure black</small></span>
      </button>
      <button type="button" className="theme-selector__choice" aria-pressed={value === 'ambience'}
        onClick={() => onChange('ambience')}>
        <span className="theme-selector__preview theme-selector__preview--ambience">
          {artwork ? <img src={artwork} alt="" aria-hidden="true"/> : null}
          <Sparkles size={23} aria-hidden="true"/>
          <span className="theme-selector__check">{value === 'ambience' ? <Check size={14}/> : null}</span>
        </span>
        <span className="theme-selector__description"><strong>Ambience</strong><small>Artwork background</small></span>
      </button>
    </div>
  )
}
