export type TrackId = string

export interface ArtworkRef {
  uri: string
  alt?: string
}

export interface LocalTrackSource {
  kind: 'local'
  uri: string
}

export type TrackSource = LocalTrackSource

export interface Track {
  id: TrackId
  title: string
  artist: string
  album?: string
  duration: number
  artwork?: ArtworkRef
  source: TrackSource
}
