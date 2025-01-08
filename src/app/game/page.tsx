'use client'
import React, {useState, useEffect} from 'react'
export default function Page() {
    const [count, setCount] = useState<number>(501);
    const [current, setCurrent] = useState<string>('');
    return (
        <div className="w-full h-full bg-black flex flex-col">
            <div className="w-full h-16 bg-red-300"></div>
            <div className='h-full bg-green-300 flex flex-col items-center justify-center overflow-hidden'>
            <div className="w-full h-[35dvh] bg-red-600 flex items-center justify-center">
                <span className='font-bold text-2xl'>{count}</span>
            </div>
            <div className="w-full h-[55dvh] bg-red-800 flex flex-col justify-between pb-4">
                <div className='flex items-center justify-center'>
                    <input type="text" disabled className='input input-lg text-black disabled:text-black' value={current}/>
                    <button className='btn btn-success btn-lg' onClick={()=>(setCount(count - parseInt(current)))}>Mehet</button>
                </div>
                <div className='flex flex-wrap gap-2 items-center justify-center'>
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="h-16 flex items-center justify-center w-16 bg-blue-300" onClick={() => setCurrent(current + i.toString())}>{i}</div>
                ))}
                </div>
            </div>
            </div>
        </div>
    )
}