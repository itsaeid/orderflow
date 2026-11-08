import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'سیفی فلو | مدیریت گردش سفارش',description:'سامانه یکپارچه مدیریت سفارش، تولید و تحویل گروه صنعتی سیفی'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl"><body>{children}</body></html>}
