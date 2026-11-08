import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn=(...inputs: Parameters<typeof clsx>)=>twMerge(clsx(inputs));
const variants=cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600',{variants:{variant:{default:'bg-teal-700 text-white hover:bg-teal-800',outline:'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',ghost:'hover:bg-slate-100 text-slate-500',destructive:'bg-rose-50 text-rose-700 hover:bg-rose-100'},size:{default:'h-10 px-4',sm:'h-8 px-3 text-xs',icon:'h-10 w-10'}},defaultVariants:{variant:'default',size:'default'}});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>,VariantProps<typeof variants>{asChild?:boolean}
export function Button({className,variant,size,asChild=false,...props}:ButtonProps){const Comp=asChild?Slot:'button';return <Comp className={cn(variants({variant,size,className}))} {...props}/>}
