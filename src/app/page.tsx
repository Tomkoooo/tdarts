import React from "react";
import UserCard from "@/components/userCard";
import Link from "next/link"
export default function Page(){
    return (
      <div className="w-full">
        <UserCard/>
        <Link href="/game" className="btn btn-outline btn-warning">Új játek</Link>
      </div>    
    )
}