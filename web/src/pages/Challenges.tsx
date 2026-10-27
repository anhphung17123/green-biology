import { Clock, Trophy } from "lucide-react";
import { mockChallenges } from "../mock-data";

export default function Challenges(){return <div className="page"><div className="page-head"><div><span className="kicker">HÀNH ĐỘNG XANH</span><h1>Thử thách dành cho bạn</h1><p>Hoàn thành hoạt động và tích điểm xanh.</p></div></div><div className="challenge-grid">{mockChallenges.map(challenge=><article className="challenge" key={challenge.id}><div className="points"><Trophy size={17}/>{challenge.points} điểm</div><h2>{challenge.title}</h2><p>{challenge.description}</p><small><Clock size={15}/> Kết thúc {new Date(challenge.endsAt).toLocaleDateString("vi-VN")}</small><div className="proof">Minh chứng: {challenge.proofInstructions}</div></article>)}</div></div>}
