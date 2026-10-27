import { FormEvent, useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Upload } from 'lucide-react';
import { api } from '../api';

type SpeciesData = {
  species_name: string;
  scientific_name: string;
  endangerment_level: string;
  characteristics: string;
  habitat: string;
  conservation_guide: string;
  fun_facts: string[];
  student_question: string;
  student_answer: string;
  confidence: number;
};
type Result = { success: true; mode: 'species'; data: SpeciesData; log_id: number; image_url: string };

const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxBytes = 5 * 1024 * 1024;
const conservationLabels: Record<string, string> = {
  EX: 'Tuyệt chủng', EW: 'Tuyệt chủng ngoài tự nhiên', CR: 'Cực kỳ nguy cấp', EN: 'Nguy cấp',
  VU: 'Sẽ nguy cấp', NT: 'Sắp bị đe dọa', LC: 'Ít quan tâm', DD: 'Thiếu dữ liệu', NE: 'Chưa đánh giá',
};

export default function Recognition() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState('');
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setPreviewUrl(''); return; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(next?: File) {
    setResult(undefined);
    if (!next) { setFile(undefined); return; }
    if (!allowedTypes.includes(next.type)) { setFile(undefined); setError('Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.'); return; }
    if (next.size > maxBytes) { setFile(undefined); setError('Ảnh không được vượt quá 5 MB.'); return; }
    setError(''); setFile(next);
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

  function reset() {
    setFile(undefined); setResult(undefined); setError('');
    if (inputRef.current) inputRef.current.value = '';
    inputRef.current?.click();
  }

  const data = result?.data;
  const levelLabel = data ? conservationLabels[data.endangerment_level.toUpperCase()] || data.endangerment_level : '';

  return <div className="page recognition">
    <span className="kicker">SPECIES API</span>
    <h1>Nhận diện động vật</h1>
    <p>Tải ảnh rõ nét để nhận diện loài và khám phá thông tin bảo tồn.</p>

    {!result && <form className="upload-box" onSubmit={submit}>
      {previewUrl ? <img className="recognition-preview" src={previewUrl} alt="Ảnh động vật đã chọn" /> : <Camera size={45} />}
      <input ref={inputRef} id="species-image" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => chooseFile(event.target.files?.[0])} />
      <label htmlFor="species-image"><Upload /> {file?.name || 'Chọn ảnh động vật'}</label>
      <small>JPEG, PNG hoặc WebP · tối đa 5 MB</small>
      <button className="btn primary" disabled={!file || busy}>{busy ? 'Đang phân tích…' : 'Nhận diện'}</button>
    </form>}

    {error && <div className="notice">{error} Ứng dụng không tạo kết quả giả khi Species API không khả dụng.</div>}

    {data && <article className="species-result">
      <img className="species-hero" src={previewUrl || result.image_url} alt={`Ảnh ${data.species_name}`} />
      <header className="species-heading">
        <div><h2>{data.species_name}</h2><i>{data.scientific_name}</i></div>
        <span className={`conservation-badge level-${data.endangerment_level.toLowerCase()}`}>{levelLabel}</span>
      </header>
      <div className="species-confidence">Độ tin cậy: <b>{Math.round(data.confidence * 100)}%</b></div>

      <section className="species-info-card"><h3>🔎 Đặc điểm nhận dạng</h3><p>{data.characteristics}</p></section>
      <section className="species-info-card"><h3>⚠️ Mức độ nguy cấp</h3><p><b>{data.endangerment_level}</b> – {levelLabel} theo thang IUCN.</p></section>
      <section className="species-info-card"><h3>🏠 Môi trường sống</h3><p>{data.habitat}</p></section>
      <section className="species-info-card"><h3>🌱 Hướng dẫn bảo tồn</h3><p>{data.conservation_guide}</p></section>

      {data.fun_facts.length > 0 && <section className="species-facts"><h3>✨ Bạn có biết?</h3><ul>{data.fun_facts.map((fact) => <li key={fact}>✨ <span>{fact}</span></li>)}</ul></section>}
      <section className="species-quiz"><h3>📝 Câu hỏi ôn nhanh</h3><strong>{data.student_question}</strong><hr /><p>Đáp án: {data.student_answer}</p></section>
      <button className="recognize-again" type="button" onClick={reset}><RefreshCw size={20} /> Nhận diện ảnh khác</button>
    </article>}
  </div>;
}
