export interface NativeLibraryFolder {
  path: string
  name: string
}

export interface NativeLibraryTrack {
  id: string
  title: string
  artist: string
  album: string | null
  duration: number
  path: string
  artworkPath: string | null
}

export interface NativeLibrarySnapshot {
  folders: NativeLibraryFolder[]
  tracks: NativeLibraryTrack[]
}
