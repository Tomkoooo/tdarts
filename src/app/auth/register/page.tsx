'use client'
import React, {useState, useEffect} from "react";
import axios from "axios";

export default function Login(){
    //formData handler
    return(
        <div className="w-full h-[100dvh] flex items-center justify-center">
            <div className="card w-92 opacity-2 shadow-xl rounded-xl ">
                    <form className="card-body">
                    <h1 className="card-title">Regisztráció</h1>
                        <input className="input input-sm input-bordered input-secondary" type="text" placeholder="e.g Elek"/>
                        <input className="input input-sm input-bordered input-secondary" type="email" placeholder="e.g teszt@elek.com"/>
                        <input className="input input-sm input-bordered input-secondary" type="password" placeholder="e.g Jelszó"/>  
                        <div className="card-actions ">
                            <button className="btn-xs btn-primary btn" type="submit">Regisztráció</button>
                            <button className="btn-xs btn-secondary btn-outline btn">Bejelentkezés</button>
                        </div>               
                    </form>
            </div>
        </div>
    )
}