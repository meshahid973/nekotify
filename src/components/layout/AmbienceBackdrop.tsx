import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useUiStore } from '@/stores/ui.store'
import './AmbienceBackdrop.css'

interface BackdropImage { url:string; shade:number }
interface BackdropLayers { current:BackdropImage|null; previous:BackdropImage|null }

function contrastShade(image:HTMLImageElement) {
  try {
    const canvas=document.createElement('canvas')
    canvas.width=8;canvas.height=8
    const context=canvas.getContext('2d',{willReadFrequently:true})
    if(!context)return .75
    context.drawImage(image,0,0,8,8)
    const pixels=context.getImageData(0,0,8,8).data
    let brightness=0
    for(let i=0;i<pixels.length;i+=4) {
      brightness+=(pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722)/255
    }
    return Math.max(.65,Math.min(.86,.62+(brightness/64)*.25))
  }catch{return .75}
}

export function AmbienceBackdrop({artwork,active}:{artwork?:string;active:boolean}) {
  const preference=useUiStore(s=>s.motionPreference)
  const [layers,setLayers]=useState<BackdropLayers>({current:null,previous:null})
  useEffect(()=>{
    if(!active||!artwork)return
    let canceled=false
    const image=new Image()
    image.crossOrigin='anonymous'
    image.onload=()=>{
      if(canceled)return
      const next={url:artwork,shade:contrastShade(image)}
      setLayers(old=>old.current?.url===next.url?old:
        {current:next,previous:old.current})
    }
    image.onerror=()=>{ /* Keep previous artwork if the new file is missing. */ }
    image.src=artwork
    return()=>{canceled=true;image.onload=null;image.onerror=null}
  },[artwork,active])
  useEffect(()=>{
    if(!layers.previous)return
    const id=window.setTimeout(()=>setLayers(old=>({...old,previous:null})),650)
    return()=>window.clearTimeout(id)
  },[layers.current,layers.previous])
  if(!active||(!layers.current&&!layers.previous))return null
  const shade=layers.current?.shade??layers.previous?.shade??.75
  const style={'--ambience-opacity':shade} as CSSProperties
  return <div className="ambience-backdrop" style={style} aria-hidden="true"
    data-reduced={preference==='reduced'?'true':'false'}>
    {layers.previous&&layers.previous.url!==layers.current?.url?
      <div className="ambience-backdrop__image"
        style={{backgroundImage:`url("${layers.previous.url}")`}}/>:null}
    {layers.current?<div key={layers.current.url}
      className="ambience-backdrop__image ambience-backdrop__image--incoming"
      style={{backgroundImage:`url("${layers.current.url}")`}}/>:null}
    <div className="ambience-backdrop__shade"/>
  </div>
}
