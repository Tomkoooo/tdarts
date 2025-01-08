import {UserProvider} from '@/hooks/user'
import { Metadata } from 'next'
import React from 'react'
import './global.css'

export default async  function RootLayout({
    children,
    params: { locale }
  }: Readonly<{
    children: React.ReactNode;
    params: { locale: string }
  }>) {
    return (
        <html data-theme='retro'>
            <head></head>
            <body className='flex flex-col h-full min-h-[100dvh]'>
                <UserProvider>
                    {children}
                </UserProvider>
            </body>
        </html>
    )
  }