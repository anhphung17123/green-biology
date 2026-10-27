import { LayoutDashboard } from "lucide-react";
import { mockTeacherStats } from "../mock-data";

const labels:Record<string,string>={students:"Học sinh",teachers:"Giáo viên",reports:"Báo cáo",challenges:"Thử thách"};
export default function Teacher(){return <div className="page teacher"><div className="page-head"><div><span className="kicker">KHU VỰC GIÁO VIÊN</span><h1>Tổng quan</h1><p>Dữ liệu minh họa được khai báo trực tiếp trong web.</p></div><LayoutDashboard size={48}/></div><div className="stats">{Object.entries(mockTeacherStats).map(([key,value])=><article key={key}><strong>{value}</strong><span>{labels[key]}</span></article>)}</div></div>}
