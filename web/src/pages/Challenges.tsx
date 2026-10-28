import { FormEvent, useEffect, useState } from "react";
import { Clock, ExternalLink, Trophy } from "lucide-react";
import { type ChallengeProof, type GreenChallenge, listChallengeProofs, listGreenChallenges, submitChallengeProof } from "../api";
import { useAuth } from "../auth";
import ChallengeManager from "../components/ChallengeManager";
import LoadingState from "../components/LoadingState";

const statusText = { PENDING: "Chờ giáo viên duyệt", APPROVED: "Đã hoàn thành", REJECTED: "Chưa được chấp nhận" };

export default function Challenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<GreenChallenge[]>([]);
  const [proofs, setProofs] = useState<ChallengeProof[]>([]);
  const [selected, setSelected] = useState<GreenChallenge>();
  const [imageUrl, setImageUrl] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [items, ownProofs] = await Promise.all([
        listGreenChallenges(),
        user?.role === "STUDENT" ? listChallengeProofs(user.username) : Promise.resolve([]),
      ]);
      setChallenges(items);
      setProofs(ownProofs);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải thử thách");
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, [user?.username, user?.role]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user || !selected) return;
    setBusy(true);
    setMessage("");
    try {
      await submitChallengeProof(user.username, selected.id, imageUrl, note);
      setMessage("Đã gửi minh chứng. Giáo viên sẽ xem xét kết quả.");
      setSelected(undefined);
      setImageUrl("");
      setNote("");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể gửi minh chứng");
    } finally { setBusy(false); }
  }

  if (user?.role === "TEACHER") return <div className="page"><div className="page-head"><div><span className="kicker">KHU VỰC GIÁO VIÊN</span><h1>Quản lý thử thách xanh</h1><p>Tạo, chỉnh sửa và xóa thử thách dành cho học sinh.</p></div><Trophy size={48}/></div><ChallengeManager /></div>;
  if (loading) return <div className="page"><LoadingState label="Đang tải thử thách…" /></div>;

  return <div className="page"><div className="page-head"><div><span className="kicker">HÀNH ĐỘNG XANH</span><h1>Thử thách dành cho bạn</h1><p>Gửi link ảnh minh chứng để thi đua và tích điểm xanh.</p></div></div>{message&&<div className="notice">{message}</div>}<div className="challenge-grid">{challenges.map((challenge)=>{const proof=proofs.filter((item)=>item.challengeId===challenge.id).at(-1);return <article className="challenge" key={challenge.id}><div className="points"><Trophy size={17}/>{challenge.points} điểm</div><h2>{challenge.title}</h2><p>{challenge.description}</p><strong className="challenge-target">Mục tiêu: {challenge.target}</strong><small><Clock size={15}/> Kết thúc {new Date(challenge.endsAt).toLocaleDateString("vi-VN")}</small><div className="proof">Minh chứng: {challenge.proofInstructions}</div>{proof&&<div className={`proof-status ${proof.status.toLowerCase()}`}><span>{statusText[proof.status]}</span><a href={proof.imageUrl} target="_blank" rel="noreferrer">Xem ảnh <ExternalLink size={14}/></a></div>}<button className="btn primary" onClick={()=>setSelected(challenge)}>Gửi minh chứng</button></article>})}</div>{selected&&<div className="proof-modal-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)setSelected(undefined)}}><form className="proof-modal" onSubmit={submit}><h2>{selected.title}</h2><label>Link ảnh minh chứng<input type="url" value={imageUrl} onChange={(e)=>setImageUrl(e.target.value)} required placeholder="https://..."/></label><label>Ghi chú<textarea value={note} onChange={(e)=>setNote(e.target.value)} placeholder="Mô tả kết quả của bạn"/></label><div><button type="button" className="btn secondary" onClick={()=>setSelected(undefined)}>Hủy</button><button className="btn primary" disabled={busy}>{busy?"Đang gửi…":"Gửi giáo viên"}</button></div></form></div>}</div>;
}
