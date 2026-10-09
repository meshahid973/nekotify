import { create } from 'zustand'
type ToastKind='success'|'error'|'info'
export interface ToastMessage {
  id:number;text:string;kind:ToastKind
  action?:{label:string;run:()=>void}
}
let serial=0
interface ToastState {
  messages:ToastMessage[]
  push:(text:string,kind?:ToastKind,action?:ToastMessage['action'])=>void
  remove:(id:number)=>void
}
export const useToastStore=create<ToastState>(set=>({
  messages:[],
  push:(text,kind='info',action)=>set(s=>({
    messages:[...s.messages.slice(-3),{id:++serial,text,kind,action}],
  })),
  remove:id=>set(s=>({messages:s.messages.filter(x=>x.id!==id)})),
}))
export const notify=(text:string,kind:ToastKind='info',
  action?:ToastMessage['action'])=>useToastStore.getState().push(text,kind,action)
