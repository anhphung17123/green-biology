import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, ExternalLink, MapPin, X } from "lucide-react";
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

type PendingItem = { type: "report" | "proof"; id: string };

export default function TeacherPending() {
  const { user } = useAuth();
  const [reports, setReports] = useState<PollutionReport[]>([]);
  const [proofs, setProofs] = useState<ChallengeProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<PendingItem | null>(null);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setMessage("");
    try {
      const [reportItems, proofItems] = await Promise.all([
        listPollutionReports(user.username),
        listChallengeProofs(user.username),
      ]);
      setReports(reportItems.filter((item) => item.status === "PENDING"));
      setProofs(proofItems.filter((item) => item.status === "PENDING"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải dữ liệu chờ duyệt");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function review(
    item: PendingItem,
    status: "APPROVED" | "REJECTED",
  ) {
    if (!user || reviewing) return;
    setReviewing(item);
    setMessage("");
    try {
      if (item.type === "report") {
        await reviewPollutionReport(user.username, item.id, status);
        setReports((current) => current.filter(({ id }) => id !== item.id));
      } else {
        await reviewChallengeProof(user.username, item.id, status);
        setProofs((current) => current.filter(({ id }) => id !== item.id));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật trạng thái");
    } finally {
      setReviewing(null);
    }
  }

  const total = reports.length + proofs.length;
  const isReviewing = (type: PendingItem["type"], id: string) =>
    reviewing?.type === type && reviewing.id === id;

  return (
    <div className="page teacher pending-page">
      <div className="page-head">
        <div>
          <span className="kicker">KHU VỰC GIÁO VIÊN</span>
          <h1>Nội dung chờ duyệt</h1>
          <p>Kiểm soát tất cả báo cáo và minh chứng học sinh đang chờ xử lý.</p>
        </div>
        <Clock3 size={48} />
      </div>

      {message && <div className="notice">{message}</div>}
      {loading ? (
        <LoadingState label="Đang tải nội dung chờ duyệt…" />
      ) : (
        <>
          <div className="stats pending-stats">
            <article><strong>{total}</strong><span>Tổng chờ duyệt</span></article>
            <article><strong>{reports.length}</strong><span>Báo cáo vi phạm</span></article>
            <article><strong>{proofs.length}</strong><span>Minh chứng thử thách</span></article>
          </div>

          {total === 0 && (
            <div className="pending-empty">
              <Check size={28} />
              <h2>Đã xử lý hết</h2>
              <p>Hiện không có nội dung nào đang chờ giáo viên duyệt.</p>
            </div>
          )}

          {reports.length > 0 && (
            <section className="teacher-review">
              <h2>Báo cáo vi phạm ({reports.length})</h2>
              <div className="review-grid">
                {reports.map((report) => (
                  <article className="review-card" key={report.id}>
                    <div className="history-card-heading">
                      <span className="status-badge pending">Chờ duyệt</span>
                      <small>{new Date(report.createdAt).toLocaleString("vi-VN")}</small>
                    </div>
                    <div className="review-images">
                      {report.imageUrls.map((url, index) => (
                        <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt={`Ảnh báo cáo ${index + 1}`} />
                        </a>
                      ))}
                    </div>
                    <h3>{report.title}</h3>
                    <p>{report.description}</p>
                    <small><MapPin size={14} />{report.latitude}, {report.longitude} · {report.studentName}</small>
                    <div className="review-actions">
                      <button className="btn reject" disabled={isReviewing("report", report.id)} onClick={() => void review({ type: "report", id: report.id }, "REJECTED")}><X size={16} />Không chấp nhận</button>
                      <button className="btn primary" disabled={isReviewing("report", report.id)} onClick={() => void review({ type: "report", id: report.id }, "APPROVED")}><Check size={16} />Chấp nhận</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {proofs.length > 0 && (
            <section className="teacher-review">
              <h2>Minh chứng thử thách ({proofs.length})</h2>
              <div className="review-grid">
                {proofs.map((proof) => (
                  <article className="review-card" key={proof.id}>
                    <div className="history-card-heading">
                      <span className="status-badge pending">Chờ duyệt</span>
                      <small>{new Date(proof.createdAt).toLocaleString("vi-VN")}</small>
                    </div>
                    <a className="proof-link" href={proof.imageUrl} target="_blank" rel="noreferrer">Xem ảnh minh chứng <ExternalLink size={15} /></a>
                    <h3>{proof.studentName}</h3>
                    <p>{proof.note || "Không có ghi chú"}</p>
                    <small>Thử thách: {proof.challengeId}</small>
                    <div className="review-actions">
                      <button className="btn reject" disabled={isReviewing("proof", proof.id)} onClick={() => void review({ type: "proof", id: proof.id }, "REJECTED")}><X size={16} />Không chấp nhận</button>
                      <button className="btn primary" disabled={isReviewing("proof", proof.id)} onClick={() => void review({ type: "proof", id: proof.id }, "APPROVED")}><Check size={16} />Chấp nhận</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
