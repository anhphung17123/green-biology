import { useEffect, useState } from "react";
import { Medal, Trophy } from "lucide-react";
import { listLeaderboard } from "../api";
import LoadingState from "../components/LoadingState";

type Row = { id:string;name:string;points:number };
export default function Leaderboard(){
  const [rows,setRows]=useState<Row[]>([]),[message,setMessage]=useState(""),[loading,setLoading]=useState(true);
  useEffect(()=>{listLeaderboard().then(setRows).catch((error)=>setMessage(error instanceof Error?error.message:"Không thể tải bảng xếp hạng")).finally(()=>setLoading(false))},[]);
  return <div className="page"><div className="page-head"><div><span className="kicker">BẢNG XẾP HẠNG</span><h1>Những mầm xanh nổi bật</h1><p>Điểm được cộng từ minh chứng thử thách đã được giáo viên chấp nhận.</p></div><Trophy size={48}/></div>{message&&<div className="notice">{message}</div>}{loading?<LoadingState/>:<div className="leaderboard">{rows.map((user,index)=><div className="leader-row" key={user.id}><span className={`rank r${index+1}`}>{index<3?<Medal/>:index+1}</span><strong>{user.name}</strong><b>{user.points} điểm</b></div>)}</div>}</div>
}
