import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loginWithGoogleSheet, registerWithGoogleSheet } from "./api";

export type User = { id:string;name:string;username:string;role:"STUDENT"|"TEACHER";points:number };
type Auth = { user:User|null;loading:boolean;login:(username:string,pwd:string)=>Promise<void>;register:(username:string,pwd:string,name:string)=>Promise<void>;logout:()=>void;refresh:()=>Promise<void> };
const Context=createContext<Auth>(null!);
const STORAGE_KEY="green_user";

export function AuthProvider({children}:{children:ReactNode}){
  const[user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true);
  async function refresh(){try{const raw=localStorage.getItem(STORAGE_KEY);setUser(raw?JSON.parse(raw):null)}catch{localStorage.removeItem(STORAGE_KEY);setUser(null)}finally{setLoading(false)}}
  useEffect(()=>{void refresh()},[]);
  async function login(username:string,pwd:string){const next=await loginWithGoogleSheet<User>(username,pwd);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));setUser(next)}
  async function register(username:string,pwd:string,name:string){const next=await registerWithGoogleSheet<User>(username,pwd,name);localStorage.setItem(STORAGE_KEY,JSON.stringify(next));setUser(next)}
  function logout(){localStorage.removeItem(STORAGE_KEY);setUser(null)}
  return <Context.Provider value={{user,loading,login,register,logout,refresh}}>{children}</Context.Provider>;
}

export const useAuth=()=>useContext(Context);
