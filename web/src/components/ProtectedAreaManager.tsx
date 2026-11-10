import { FormEvent, useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import {
  createProtectedArea,
  deleteProtectedArea,
  listProtectedAreas,
  updateProtectedArea,
  type ProtectedAreaRecord,
} from "../api";
import LoadingState from "./LoadingState";

type FormState = Omit<ProtectedAreaRecord, "id"> & { id?: string };
const emptyForm: FormState = {
  name: "",
  type: "Nature Reserve",
  establishedYear: new Date().getFullYear(),
  googleMapsUrl: "",
  mobileStreetViewUrl: "",
  provinces: [],
  latitude: 16.0544,
  longitude: 108.2022,
  areaHa: 1,
  description: "",
  endemicSpecies: [],
  endangeredSpecies: [],
  images: [],
};

function lines(value: string) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

export default function ProtectedAreaManager() {
  const [areas, setAreas] = useState<ProtectedAreaRecord[]>([]);
  const [form, setForm] = useState<FormState>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      setAreas(await listProtectedAreas());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải khu bảo tồn");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      if (form.id) await updateProtectedArea(form as ProtectedAreaRecord);
      else {
        const { id: _id, ...payload } = form;
        await createProtectedArea(payload);
      }
      setForm(undefined);
      setMessage("Đã lưu khu bảo tồn.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu khu bảo tồn");
    } finally {
      setSaving(false);
    }
  }

  async function remove(area: ProtectedAreaRecord) {
    if (!window.confirm(`Xóa “${area.name}” khỏi bản đồ?`)) return;
    setMessage("");
    try {
      await deleteProtectedArea(area.id);
      if (form?.id === area.id) setForm(undefined);
      setMessage("Đã xóa khu bảo tồn.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xóa khu bảo tồn");
    }
  }

  return (
    <section className="teacher-review protected-area-manager">
      <div className="manager-heading">
        <div>
          <h2>Quản lý khu bảo tồn</h2>
          <p>Thêm, sửa hoặc xóa các địa điểm hiển thị trên bản đồ khám phá.</p>
        </div>
        <button className="btn primary" type="button" onClick={() => setForm({ ...emptyForm })}>
          <Plus size={17} /> Thêm khu bảo tồn
        </button>
      </div>
      {message && <div className="notice">{message}</div>}
      {form && (
        <form className="protected-area-editor" onSubmit={submit}>
          <div className="manager-heading">
            <h3>{form.id ? "Chỉnh sửa khu bảo tồn" : "Khu bảo tồn mới"}</h3>
            <button className="icon-button" type="button" onClick={() => setForm(undefined)} aria-label="Đóng biểu mẫu"><X size={18} /></button>
          </div>
          <div className="protected-area-form-grid">
            <label className="span2">Tên<input required minLength={3} value={form.name} onChange={(e) => field("name", e.target.value)} /></label>
            <label>Loại<select value={form.type} onChange={(e) => field("type", e.target.value as FormState["type"])}><option value="Nature Reserve">Khu bảo tồn thiên nhiên</option><option value="National Park">Vườn quốc gia</option></select></label>
            <label>Năm thành lập<input required type="number" min="1800" max={new Date().getFullYear()} value={form.establishedYear} onChange={(e) => field("establishedYear", Number(e.target.value))} /></label>
            <label>Tỉnh/thành (phân cách bằng dấu phẩy)<input required value={form.provinces.join(", ")} onChange={(e) => field("provinces", lines(e.target.value))} /></label>
            <label>Diện tích (ha)<input required type="number" min="0.01" step="0.01" value={form.areaHa} onChange={(e) => field("areaHa", Number(e.target.value))} /></label>
            <label>Vĩ độ<input required type="number" min="-90" max="90" step="any" value={form.latitude} onChange={(e) => field("latitude", Number(e.target.value))} /></label>
            <label>Kinh độ<input required type="number" min="-180" max="180" step="any" value={form.longitude} onChange={(e) => field("longitude", Number(e.target.value))} /></label>
            <label className="span2">Google Maps URL<input required type="url" value={form.googleMapsUrl} onChange={(e) => field("googleMapsUrl", e.target.value)} /></label>
            <label className="span2">Mobile Street View URL (không bắt buộc)<input type="url" value={form.mobileStreetViewUrl || ""} onChange={(e) => field("mobileStreetViewUrl", e.target.value)} /></label>
            <label className="span2">Mô tả<textarea required minLength={20} value={form.description} onChange={(e) => field("description", e.target.value)} /></label>
            <label>Loài đặc hữu (mỗi dòng một loài)<textarea value={form.endemicSpecies.join("\n")} onChange={(e) => field("endemicSpecies", lines(e.target.value))} /></label>
            <label>Loài nguy cấp (mỗi dòng một loài)<textarea value={form.endangeredSpecies.join("\n")} onChange={(e) => field("endangeredSpecies", lines(e.target.value))} /></label>
            <label className="span2">URL ảnh (mỗi dòng một URL)<textarea value={form.images.join("\n")} onChange={(e) => field("images", lines(e.target.value))} /></label>
          </div>
          <div className="challenge-editor-actions">
            <button className="btn secondary" type="button" onClick={() => setForm(undefined)}>Hủy</button>
            <button className="btn primary" disabled={saving}><Save size={16} />{saving ? "Đang lưu…" : "Lưu khu bảo tồn"}</button>
          </div>
        </form>
      )}
      {loading ? <LoadingState /> : (
        <div className="protected-area-admin-list">
          {areas.length === 0 && <p className="empty-state">Chưa có khu bảo tồn.</p>}
          {areas.map((area) => (
            <article key={area.id}>
              <div className="protected-area-list-icon"><MapPin /></div>
              <div><h3>{area.name}</h3><p>{area.provinces.join(" · ")} · {area.areaHa.toLocaleString("vi-VN")} ha</p><small>{area.latitude.toFixed(4)}, {area.longitude.toFixed(4)}</small></div>
              <div className="protected-area-row-actions">
                <button className="icon-button" type="button" title="Chỉnh sửa" aria-label={`Chỉnh sửa ${area.name}`} onClick={() => setForm({ ...area })}><Pencil size={17} /></button>
                <button className="icon-button danger" type="button" title="Xóa" aria-label={`Xóa ${area.name}`} onClick={() => void remove(area)}><Trash2 size={17} /></button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
