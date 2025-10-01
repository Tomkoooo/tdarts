import React from 'react'
import './style.css'
const page = () => {
  return (
    <div className='w-full max-h-[100dvh] h-[100dvh] overflow-hidden'>
        <div className='w-full h-14 bg-green-400'>

</div>
        <div className='flex bg-white flex-col xl:flex-row'>
            <div className='bg-black h-[40vh] xl:h-[100vh] xl:flex-col w-full flex gap-1 '>
                
                <div className='w-1/2 xl:w-full h-full bg-red-500'>
                    <p className='text-white text-6xl xl:text-8xl'>Player 1 name</p>
                    <p className='text-white text-5xl lg:text-6xl xl:text-7xl'>Score</p>
                </div>
                <div className='w-1/2 xl:w-full h-full bg-red-500'>
                    <p className='text-white text-6xl xl:text-8xl'>Player 2 name</p>
                    <p className='text-white text-5xl lg:text-6xl xl:text-7xl'>Score</p>
                </div>
            </div>
            <div className='flex flex-col w-full h-[50vh] bg-gray-300 gap-1'>
                <div className='w-full h-[8dvh] flex flex-col gap-1 bg-blue-400'>

                </div>
               <div className='w-full h-[30dvh] flex flex-col gap-1 bg-yellow-400'>
               <div className="grid grid-cols-3 gap-1 flex-1 min-h-0">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  className="btn btn-xs h-5 sm:h-6 md:h-12 text-xs font-bold matchgame-btn"
                >
                  {num}
                </button>
              ))}
              <button
                className="btn btn-warning btn-xs h-5 sm:h-6 md:h-12 text-xs matchgame-btn"
              >
                ⌫
              </button>
              <button
                className="btn btn-xs h-5 sm:h-6 md:h-12 text-xs font-bold matchgame-btn"
              >
                0
              </button>
              <button
                className="btn btn-error btn-xs h-5 sm:h-6 md:h-12 text-xs matchgame-btn"
              >
                C
              </button>
            </div>
               </div>
               
               <div className='w-full h-[12dvh] flex flex-col gap-1 bg-gray-300'>
                  <div className="flex gap-1 h-full">
                    <button
                      className="btn btn-warning flex-1 btn-xs h-6 sm:h-8 md:h-10 text-xs sm:text-sm md:text-base matchgame-btn"
                    >
                      ↶
                    </button>
                    <button
                      className="btn btn-success flex-1 btn-xs h-6 sm:h-8 md:h-10 text-xs sm:text-sm md:text-base matchgame-btn"
                    >
                      ➤
                    </button>
                  </div>
                </div>
            </div>
        </div>
    </div>
  )
}

export default page