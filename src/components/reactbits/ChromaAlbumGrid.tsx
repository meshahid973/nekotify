import { useRef } from 'react'
import { Play } from 'lucide-react'
import { Artwork } from '@/components/artwork/Artwork'
import type { Track } from '@/types/media'
import './ChromaAlbumGrid.css'

interface Album { key:string;title:string;artist:string;artwork?:Track['artwork'];songs:Track[] }
/** React Bits Chroma Grid adapted for local albums without GSAP or external images. */
export function ChromaAlbumGrid({albums,onPlay}:{
  albums:Album[];onPlay:(songs:Track[])=>void
}) {
  const root=useRef<HTMLDivElement>(null)
  return <div ref={root} className="home-albums nk-chroma"
    onPointerMove={(e)=>{
      if(e.pointerType==='touch')return
      const rect=e.currentTarget.getBoundingClientRect()
      root.current?.style.setProperty('--chroma-x',(e.clientX-rect.left)+'px')
      root.current?.style.setProperty('--chroma-y',(e.clientY-rect.top)+'px')
    }}>
    {albums.map((album)=><button key={album.key} type="button" className="home-album nk-chroma__album"
      aria-label={'Play album '+album.title} onClick={()=>onPlay(album.songs)}>
      <div className="home-album__cover">
        <Artwork size="lg" src={album.artwork?.uri} alt=""/>
        <span className="home-album__play"><Play size={19} fill="currentColor"/></span>
      </div>
      <strong>{album.title}</strong><span>{album.artist}</span>
    </button>)}
  </div>
}
