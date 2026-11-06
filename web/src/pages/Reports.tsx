import { FormEvent, useEffect, useRef, useState } from "react";
import { ImageUp, LocateFixed, MapPin, X } from "lucide-react";
import { googleMapId, loadGoogleMaps } from "../google-maps";
import { createPollutionReport, uploadEvidenceImage } from "../api";
import { useAuth } from "../auth";

type Coordinates = { lat: number; lng: number };
const fallbackLocation: Coordinates = { lat: 16.0544, lng: 108.2022 };

export default function Reports() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("WASTE");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [location, setLocation] = useState(fallbackLocation);
  const [locationMessage, setLocationMessage] = useState(
    "Đang xác định vị trí của bạn…",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const locationMarker = useRef<any>(null);
  const markerClass = useRef<any>(null);

  useEffect(() => {
    const urls = images.map((image) => URL.createObjectURL(image));
    setImagePreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  function removeImage(index: number) {
    setImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function locateStudent() {
    if (!navigator.geolocation) {
      setLocationMessage(
        "Trình duyệt không hỗ trợ định vị. Hãy chọn điểm trên bản đồ.",
      );
      return;
    }
    setLocationMessage("Đang xác định vị trí của bạn…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const current = { lat: coords.latitude, lng: coords.longitude };
        setLocation(current);
        setLocationMessage(
          "Đã dùng vị trí hiện tại. Bạn có thể kéo ghim để điều chỉnh.",
        );
        mapInstance.current?.panTo(current);
        mapInstance.current?.setZoom(17);
      },
      () =>
        setLocationMessage(
          "Không lấy được vị trí. Hãy chạm bản đồ để chọn nơi xảy ra sự cố.",
        ),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  useEffect(() => {
    locateStudent();
    let cancelled = false;
    loadGoogleMaps()
      .then(async (google) => {
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          google.maps.importLibrary("maps"),
          google.maps.importLibrary("marker"),
        ]);
        if (cancelled || !mapElement.current) return;
        const map = new Map(mapElement.current, {
          center: fallbackLocation,
          zoom: 14,
          mapId: googleMapId(),
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        map.addListener("click", (event: any) => {
          if (!event.latLng) return;
          setLocation({ lat: event.latLng.lat(), lng: event.latLng.lng() });
          setLocationMessage("Đã chọn vị trí trên bản đồ.");
        });
        mapInstance.current = map;
        markerClass.current = AdvancedMarkerElement;
        setMapReady(true);
      })
      .catch((error) =>
        setLocationMessage(
          error instanceof Error ? error.message : "Không thể tải Google Maps",
        ),
      );
    return () => {
      cancelled = true;
      if (locationMarker.current) locationMarker.current.map = null;
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const AdvancedMarkerElement = markerClass.current;
    if (!map || !AdvancedMarkerElement) return;
    if (!locationMarker.current) {
      const marker = new AdvancedMarkerElement({
        map,
        position: location,
        title: "Vị trí báo cáo",
        gmpDraggable: true,
      });
      marker.addListener("dragend", () => {
        const position = marker.position;
        const lat =
          typeof position?.lat === "function" ? position.lat() : position?.lat;
        const lng =
          typeof position?.lng === "function" ? position.lng() : position?.lng;
        if (typeof lat === "number" && typeof lng === "number") {
          setLocation({ lat, lng });
          setLocationMessage("Đã điều chỉnh vị trí ghim.");
        }
      });
      locationMarker.current = marker;
    } else {
      locationMarker.current.position = location;
    }
  }, [location, mapReady]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (!user) throw new Error("Bạn cần đăng nhập để gửi báo cáo");
      if (!images.length) throw new Error("Vui lòng chọn ít nhất một ảnh minh chứng");
      if (images.length > 6) throw new Error("Mỗi báo cáo được tải tối đa 6 ảnh");
      if (images.some((image) => image.size > 32 * 1024 * 1024))
        throw new Error("Mỗi ảnh không được vượt quá 32 MB");
      const imageUrls: string[] = [];
      for (const image of images) {
        const uploaded = await uploadEvidenceImage(user.username, image);
        imageUrls.push(uploaded.url);
      }
      await createPollutionReport({
        title,
        description,
        incidentType: type,
        latitude: location.lat,
        longitude: location.lng,
        imageUrls,
        studentUsername: user.username,
      });
      setMessage("Đã gửi báo cáo. Giáo viên sẽ duyệt trước khi hiển thị trên bản đồ.");
      setTitle("");
      setDescription("");
      setImages([]);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Không thể gửi báo cáo",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <span className="kicker">HÀNH ĐỘNG CỘNG ĐỒNG</span>
          <h1>Báo cáo vấn đề môi trường</h1>
          <p>Gửi vị trí và ảnh minh chứng để giáo viên xác minh.</p>
        </div>
      </div>
      <form className="report-form" onSubmit={submit}>
        <label>
          Tiêu đề
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={5}
          />
        </label>
        <label>
          Mô tả
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={20}
          />
        </label>
        <label>
          Loại sự cố
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="WASTE">Rác thải</option>
            <option value="WATER_POLLUTION">Ô nhiễm nước</option>
            <option value="AIR_POLLUTION">Ô nhiễm không khí</option>
            <option value="ENVIRONMENTAL_DESTRUCTION">
              Phá hoại môi trường
            </option>
            <option value="OTHER">Khác</option>
          </select>
        </label>
        <label className="report-file-picker">
          Ảnh minh chứng
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={(event) => {
              const selected = Array.from(event.target.files || []).slice(0, 6);
              setImages(selected);
              event.target.value = "";
            }}
          />
          <span className="report-file-button">
            <ImageUp size={19}/>
            {images.length ? `Đã chọn ${images.length} ảnh` : "Chọn từ 1 đến 6 ảnh"}
          </span>
          <small>JPEG, PNG, WebP hoặc GIF · tối đa 32 MB mỗi ảnh</small>
        </label>
        {images.length > 0 && (
          <div className="report-image-previews" aria-label="Ảnh đã chọn">
            {images.map((image, index) => (
              <article className="report-image-preview" key={`${image.name}-${image.lastModified}`}>
                <a
                  href={imagePreviews[index]}
                  target="_blank"
                  rel="noreferrer"
                  title="Mở ảnh để xem"
                >
                  {imagePreviews[index] && <img src={imagePreviews[index]} alt={image.name} />}
                  <span>{image.name}</span>
                </a>
                <button
                  type="button"
                  className="report-image-remove"
                  onClick={() => removeImage(index)}
                  aria-label={`Xoá ảnh ${image.name}`}
                  title="Xoá ảnh"
                >
                  <X size={16} />
                </button>
              </article>
            ))}
          </div>
        )}
        <section className="report-location-picker">
          <div className="report-location-heading">
            <div>
              <strong>Vị trí xảy ra sự cố</strong>
              <span>{locationMessage}</span>
            </div>
            <button
              className="btn secondary"
              type="button"
              onClick={locateStudent}
            >
              <LocateFixed size={17} />
              Vị trí của tôi
            </button>
          </div>
          <div
            ref={mapElement}
            className="report-map"
            aria-label="Chọn vị trí báo cáo trên bản đồ"
          />
          <div className="coord-pair">
            <label>
              Vĩ độ
              <input readOnly value={location.lat.toFixed(6)} />
            </label>
            <label>
              Kinh độ
              <input readOnly value={location.lng.toFixed(6)} />
            </label>
          </div>
        </section>
        <button className="btn primary" disabled={busy}>
          <MapPin />
          {busy ? "Đang tải ảnh và gửi…" : "Gửi báo cáo"}
        </button>
        {message && <div className="notice">{message}</div>}
      </form>
    </div>
  );
}
