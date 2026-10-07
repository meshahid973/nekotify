import { Music2 } from 'lucide-react'
import type { ImgHTMLAttributes } from 'react'

import './Artwork.css'

type ArtworkSize = 'sm' | 'md' | 'lg'

interface ArtworkProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> {
  src?: string
  size?: ArtworkSize
}

export function Artwork({
  src,
  size = 'md',
  alt = '',
  className = '',
  ...props
}: ArtworkProps) {
  if (!src) {
    return (
      <span
        className={`artwork artwork--${size} artwork--placeholder ${className}`.trim()}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
      >
        <Music2 aria-hidden="true" />
      </span>
    )
  }

  return (
    <img
      className={`artwork artwork--${size} ${className}`.trim()}
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      {...props}
    />
  )
}
