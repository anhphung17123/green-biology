import { FormEvent, useState } from 'react';
import { Camera, Upload } from 'lucide-react';
import { api } from '../api';

type Prediction = {
  identifiable: boolean;
  scientificName: string | null;
  commonName: string | null;
  organismGroup: string | null;
  identifyingFeatures: string[];
  habitat: string | null;
  certainty: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  certaintyReason: string;
  limitations: string;
};
type Result = {
  prediction: Prediction;
  warning: string;
  species?: {
    commonName: string; scientificName: string; group?: string; habitat?: string;
    characteristics?: string; conservationStatus?: string;
    source?: { title: string; url: string };
  };
};

const certaintyLabels: Record<Prediction['certainty'], string> = {
  HIGH: 'Cao', MEDIUM: 'Trung bình', LOW: 'Thấp', UNKNOWN: 'Không xác định',
};
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxBytes = 5 * 1024 * 1024;

export default function Recognition() {
  const [file, setFile] = useState<File>();
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function chooseFile(next?: File) {
    setResult(undefined);
    if (!next) { setFile(undefined); return; }
    if (!allowedTypes.includes(next.type)) { setFile(undefined); setError('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.'); return; }
    if (next.size > maxBytes) { setFile(undefined); setError('Ảnh không được vượt quá 5 MB.'); return; }
    setError('');
    setFile(next);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true); setError(''); setResult(undefined);
    const body = new FormData(); body.append('image', file);
    try { setResult(await api('/species-recognition', { method: 'POST', body })); }
    catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Nhận diện thất bại'); }
    finally { setBusy(false); }
  }

  return <div className="page recognition">
    <span className="kicker">OPENAI VISION</span>
    <h1>Nhận diện sinh vật</h1>
    <p>Tải ảnh rõ nét của thực vật hoặc động vật. Kết quả chỉ là dự đoán sơ bộ và được đối chiếu với cơ sở dữ liệu loài của hệ thống.</p>
    <form className="upload-box" onSubmit={submit}>
      <Camera size={45} />
      <input id="species-image" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => chooseFile(event.target.files?.[0])} />
      <label htmlFor="species-image"><Upload /> {file?.name || 'Chọn ảnh sinh vật'}</label>
      <small>JPEG, PNG hoặc WebP · tối đa 5 MB</small>
      <button className="btn primary" disabled={!file || busy}>{busy ? 'Đang phân tích…' : 'Nhận diện'}</button>
    </form>
    {error && <div className="notice">{error} Ứng dụng không tạo kết quả giả khi OpenAI không khả dụng.</div>}
    {result && <div className="prediction">
      <h2>{result.prediction.commonName || 'Chưa đủ thông tin để xác định loài'}</h2>
      {result.prediction.scientificName && <i>{result.prediction.scientificName}</i>}
      {result.prediction.organismGroup && <p>Nhóm sinh vật: {result.prediction.organismGroup}</p>}
      <p><b>Mức chắc chắn:</b> {certaintyLabels[result.prediction.certainty]} — {result.prediction.certaintyReason}</p>
      {result.prediction.identifyingFeatures.length > 0 && <div>
        <h3>Đặc điểm nhận dạng quan sát được</h3>
        <ul>{result.prediction.identifyingFeatures.map((feature) => <li key={feature}>{feature}</li>)}</ul>
      </div>}
      <p><b>Môi trường sống thường gặp:</b> {result.prediction.habitat || 'Không thể xác định đáng tin cậy từ ảnh này.'}</p>
      <p><b>Giới hạn:</b> {result.prediction.limitations}</p>
      <strong>{result.warning}</strong>
      {result.species ? <div className="verified">
        <h3>Thông tin đã đối chiếu trong cơ sở dữ liệu</h3>
        <p>{result.species.habitat || 'Chưa có dữ liệu sinh cảnh'}</p>
        <p>{result.species.characteristics}</p>
        <p>Tình trạng bảo tồn: {result.species.conservationStatus || 'Chưa có dữ liệu có nguồn'}</p>
        {result.species.source?.url && <a href={result.species.source.url} target="_blank" rel="noreferrer">{result.species.source.title}</a>}
      </div> : <p>Chưa tìm thấy bản ghi tương ứng trong cơ sở dữ liệu loài.</p>}
    </div>}
  </div>;
}
