import { FormEvent, useState } from "react";
import { MapPin } from "lucide-react";

export default function Reports() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("WASTE");
  const [lat, setLat] = useState(16.0544);
  const [lng, setLng] = useState(108.2022);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const reports=JSON.parse(localStorage.getItem("green_mock_reports")||"[]");
      reports.push({id:crypto.randomUUID(),title,description,incidentType:type,latitude:lat,longitude:lng,createdAt:new Date().toISOString()});
      localStorage.setItem("green_mock_reports",JSON.stringify(reports));
      setMessage("Đã lưu báo cáo minh họa trên trình duyệt.");
      setTitle("");
      setDescription("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể gửi báo cáo");
    } finally {
      setBusy(false);
    }
  }

  return <div className="page"><div className="page-head"><div><span className="kicker">HÀNH ĐỘNG CỘNG ĐỒNG</span><h1>Báo cáo vấn đề môi trường</h1><p>Dữ liệu minh họa chỉ được lưu trên trình duyệt hiện tại.</p></div></div><form className="report-form" onSubmit={submit}><label>Tiêu đề<input value={title} onChange={e=>setTitle(e.target.value)} required minLength={5}/></label><label>Mô tả<textarea value={description} onChange={e=>setDescription(e.target.value)} required minLength={20}/></label><label>Loại sự cố<select value={type} onChange={e=>setType(e.target.value)}><option value="WASTE">Rác thải</option><option value="WATER_POLLUTION">Ô nhiễm nước</option><option value="AIR_POLLUTION">Ô nhiễm không khí</option><option value="ENVIRONMENTAL_DESTRUCTION">Phá hoại môi trường</option><option value="OTHER">Khác</option></select></label><div className="coord-pair"><label>Vĩ độ<input type="number" step="any" value={lat} onChange={e=>setLat(+e.target.value)}/></label><label>Kinh độ<input type="number" step="any" value={lng} onChange={e=>setLng(+e.target.value)}/></label></div><button className="btn primary" disabled={busy}><MapPin/>{busy?'Đang gửi…':'Gửi báo cáo'}</button>{message&&<div className="notice">{message}</div>}</form></div>;
}
