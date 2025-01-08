'use client'
import { useUserContext } from '@/hooks/user'
import Image from 'next/image'
import React from 'react'
import Link from 'next/link'
import { IconDotsVertical, IconUserCircle } from '@tabler/icons-react'
export default function UserCard() {
    const {user, loading} = useUserContext()
    const userIconSrc = user && !loading ? `data:${user.icon.type};base64,${user.icon.data}` : '/no-img.webp';

    return (
        <div className='w-full h-32 flex p-4 shadow-lg bg-primary items-center rounded-bl-xl rounded-br-xl'>
        <figure className='w-32'>
            {user && !loading && user.icon ? (
                <Image
                src={userIconSrc}
                height={300}
                width={300}
                alt='profile picture'
            />
            )  : (
                <IconUserCircle size={64}/>
            )}
            
        </figure>
        {user && !loading ? (
             <div className='flex flex-col justify-bewteen itemns-start pl-3'>
             <h1 className='text-2xl'>{user?.username}</h1>
             <span><IconDotsVertical/>{user.avarage}</span>
         </div>
        ) : loading ? (
            <div className='flex w-full h-full items-center justify-center'>
                <div className='spinner loading loading-spinner w-8'></div>
            </div>
        ) :
        (
           <div className='flex w-full h-full items-center justify-center gap-2'>
            <Link href={'/auth/login'} className='btn btn-secondary btn-md'>Bejelentkezés</Link>
            <Link href={'/auth/register'} className='btn btn-warning btn-outline btn-md'>Regisztráció</Link>
           </div>
        )}

    </div>
    )
}