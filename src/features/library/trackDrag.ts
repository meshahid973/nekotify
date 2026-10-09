export const TRACK_DRAG_TYPE='application/x-nekotify-track'

export function writeTrackDrag(transfer:DataTransfer,path:string) {
  transfer.effectAllowed='copy'
  transfer.setData(TRACK_DRAG_TYPE,path)
}
export function readTrackDrag(transfer:DataTransfer):string|null {
  if(!Array.from(transfer.types).includes(TRACK_DRAG_TYPE))return null
  const path=transfer.getData(TRACK_DRAG_TYPE).trim()
  return path||null
}
export function acceptsTrackDrag(types:DataTransfer['types']):boolean {
  return Array.from(types).includes(TRACK_DRAG_TYPE)
}
