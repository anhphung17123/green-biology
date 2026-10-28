import { useEffect, useState } from "react";
import { Check, ExternalLink, LayoutDashboard, MapPin, X } from "lucide-react";
import {
  type ChallengeProof,
  type PollutionReport,
  listChallengeProofs,
  listPollutionReports,
  reviewChallengeProof,
  reviewPollutionReport,
} from "../api";
import { useAuth } from "../auth";
import LoadingState from "../components/LoadingState";

export default function Teacher() {
  const { user } = useAuth();
  const [reports, setReports] = useState<PollutionReport[]>([]);
  const [proofs, setProofs] = useState<ChallengeProof[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  async function refresh() {
    if (!user) return;
    setLoading(true);
    try {
      const [reportItems, proofItems] = await Promise.all([
        listPollutionReports(user.username),
        listChallengeProofs(user.username),
      ]);
      setReports(reportItems);
      setProofs(proofItems);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể tải dữ liệu",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, [user?.username]);
  async function decideReport(id: string, status: "APPROVED" | "REJECTED") {
    if (!user) return;
    await reviewPollutionReport(user.username, id, status);
    await refresh();
  }
  async function decideProof(id: string, status: "APPROVED" | "REJECTED") {
    if (!user) return;
    await reviewChallengeProof(user.username, id, status);
    await refresh();
  }
  const pendingReports = reports.filter((item) => item.status === "PENDING"),
    pendingProofs = proofs.filter((item) => item.status === "PENDING");
  return (
    <div className="page teacher">
      <div className="page-head">
        <div>
          <span className="kicker">KHU VỰC GIÁO VIÊN</span>
          <h1>Duyệt hoạt động</h1>
          <p>Xem toàn bộ và xác minh hoạt động của học sinh.</p>
        </div>
        <LayoutDashboard size={48} />
      </div>
      {message && <div className="notice">{message}</div>}
      {loading && <LoadingState />}
      <div className="stats">
        <article>
          <strong>{pendingReports.length}</strong>
          <span>Báo cáo chờ duyệt</span>
        </article>
        <article>
          <strong>{pendingProofs.length}</strong>
          <span>Minh chứng chờ duyệt</span>
        </article>
        <article>
          <strong>
            {reports.filter((item) => item.status === "APPROVED").length}
          </strong>
          <span>Báo cáo đã chấp nhận</span>
        </article>
      </div>
      <section className="teacher-review">
        <h2>Tất cả báo cáo vi phạm</h2>
        {reports.length === 0 && (
          <p className="empty-state">Chưa có báo cáo.</p>
        )}
        <div className="review-grid">
          {reports.map((report) => (
            <article className="review-card" key={report.id}>
              <div className="history-card-heading">
                <span className={`status-badge ${report.status.toLowerCase()}`}>
                  {report.status}
                </span>
              </div>
              <div className="review-images">
                {report.imageUrls.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="Ảnh báo cáo" />
                  </a>
                ))}
              </div>
              <h3>{report.title}</h3>
              <p>{report.description}</p>
              <small>
                <MapPin size={14} />
                {report.latitude}, {report.longitude} · {report.studentName}
              </small>
              {report.status === "PENDING" && (
                <div className="review-actions">
                  <button
                    className="btn reject"
                    onClick={() => void decideReport(report.id, "REJECTED")}
                  >
                    <X size={16} />
                    Không chấp nhận
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => void decideReport(report.id, "APPROVED")}
                  >
                    <Check size={16} />
                    Chấp nhận
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="teacher-review">
        <h2>Tất cả minh chứng thử thách</h2>
        {proofs.length === 0 && (
          <p className="empty-state">Chưa có minh chứng.</p>
        )}
        <div className="review-grid">
          {proofs.map((proof) => (
            <article className="review-card" key={proof.id}>
              <div className="history-card-heading">
                <span className={`status-badge ${proof.status.toLowerCase()}`}>
                  {proof.status}
                </span>
              </div>
              <a
                className="proof-link"
                href={proof.imageUrl}
                target="_blank"
                rel="noreferrer"
              >
                Xem ảnh minh chứng <ExternalLink size={15} />
              </a>
              <h3>{proof.studentName}</h3>
              <p>{proof.note || "Không có ghi chú"}</p>
              <small>Thử thách: {proof.challengeId}</small>
              {proof.status === "PENDING" && (
                <div className="review-actions">
                  <button
                    className="btn reject"
                    onClick={() => void decideProof(proof.id, "REJECTED")}
                  >
                    <X size={16} />
                    Không chấp nhận
                  </button>
                  <button
                    className="btn primary"
                    onClick={() => void decideProof(proof.id, "APPROVED")}
                  >
                    <Check size={16} />
                    Chấp nhận
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
