'use client';
import * as D from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
export const Dialog=D.Root;
export const DialogTitle=D.Title;
export const DialogDescription=D.Description;
export function DialogContent({children}: {children:React.ReactNode}){return <D.Portal><D.Overlay className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm"/><D.Content dir="rtl" className="dialog-content"><D.Close aria-label="بستن" className="dialog-close"><X size={19}/></D.Close>{children}</D.Content></D.Portal>}
