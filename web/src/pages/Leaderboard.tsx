import { Medal, Trophy } from "lucide-react";
import { mockLeaderboard } from "../mock-data";

export default function Leaderboard(){return <div className="page"><div className="page-head"><div><span className="kicker">BẢNG XẾP HẠNG</span><h1>Những mầm xanh nổi bật</h1><p>Dữ liệu minh họa trên giao diện.</p></div><Trophy size={48}/></div><div className="leaderboard">{mockLeaderboard.map((user,index)=><div className="leader-row" key={user.id}><span className={`rank r${index+1}`}>{index<3?<Medal/>:index+1}</span><strong>{user.name}</strong><b>{user.points} điểm</b></div>)}</div></div>}
