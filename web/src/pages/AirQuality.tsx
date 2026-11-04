import { FormEvent, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CalendarClock, CloudSun, MapPin, Wind, X } from "lucide-react";
import { googleMapId, loadGoogleMaps } from "../google-maps";

type AirQuality = {
  current?: { time: string; us_aqi: number; pm2_5: number; pm10: number };
};
type Station = {
  idx: string;
  aqi: number | null;
  measuredAt: string;
  latitude: number;
  longitude: number;
  name: string;
};
type StationResponse = { stations: Station[]; source: string };
type Viewport = { bounds: string; zoom: number };

function category(value: number) {
  if (value <= 50) return "Tốt";
  if (value <= 100) return "Trung bình";
  if (value <= 150) return "Không tốt cho nhóm nhạy cảm";
  if (value <= 200) return "Không tốt";
  if (value <= 300) return "Rất không tốt";
  return "Nguy hại";
}
function color(value: number | null) {
  if (value === null) return "#75827d";
  if (value <= 50) return "#35a853";
  if (value <= 100) return "#d8a719";
  if (value <= 150) return "#e87825";
  if (value <= 200) return "#d6403a";
  if (value <= 300) return "#824b96";
  return "#7e2638";
}
async function loadAqi(latitude: number, longitude: number) {
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "us_aqi,pm2_5,pm10");
  url.searchParams.set("timezone", "auto");
  const response = await fetch(url);
  if (!response.ok) throw new Error("Không thể tải dữ liệu AQI");
  const data = (await response.json()) as AirQuality;
  if (!data.current) throw new Error("Không có dữ liệu AQI tại vị trí này");
  return data.current;
}
async function loadStations(viewport: Viewport) {
  const key = import.meta.env.VITE_WAQI_MAP_KEY?.trim();
  if (!key) throw new Error("Thiếu VITE_WAQI_MAP_KEY");
  const body = new FormData();
  body.set("bounds", viewport.bounds);
  body.set("inc", "placeholders");
  body.set("viewer", "webgl");
  body.set("zoom", String(viewport.zoom));
  body.set("country", "");
  body.set("key", key);
  const response = await fetch("https://mapq.waqi.info/mapq2/bounds", {
    method: "POST",
    body,
  });
  if (!response.ok) throw new Error("Không thể tải WAQI");
  const result = await response.json();
  if (result.status !== "ok" || !Array.isArray(result.data))
    throw new Error("WAQI trả dữ liệu không hợp lệ");
  return {
    source: "WAQI",
    stations: result.data.map((station: any) => ({
      idx: station.idx,
      aqi: Number.isFinite(Number(station.aqi)) ? Number(station.aqi) : null,
      measuredAt: station.utime,
      latitude: station.geo[0],
      longitude: station.geo[1],
      name: station.name,
    })),
  } as StationResponse;
}

export default function AirQualityPage() {
  const initial = { lat: 16.0544, lng: 108.2022 };
  const [coords, setCoords] = useState(initial),
    [active, setActive] = useState(initial);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [selectedStation, setSelectedStation] = useState<Station>();
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerClass = useRef<any>(null);
  const stationMarkers = useRef<any[]>([]);
  const [viewport, setViewport] = useState<Viewport>({
    bounds:
      "108.0608367919922,15.970571298982348,108.35025787353517,16.168515928939254",
    zoom: 12,
  });
  const current = useQuery({
    queryKey: ["aqi", active],
    queryFn: () => loadAqi(active.lat, active.lng),
  });
  const stations = useQuery({
    queryKey: ["aqi-stations", viewport],
    queryFn: () => loadStations(viewport),
    placeholderData: (previous) => previous,
  });
  const stationList = stations.data?.stations ?? [];

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(async (google) => {
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          google.maps.importLibrary("maps"),
          google.maps.importLibrary("marker"),
        ]);
        if (cancelled || !mapElement.current) return;
        const map = new Map(mapElement.current, {
          center: initial,
          zoom: 12,
          mapId: googleMapId(),
          mapTypeControl: false,
          streetViewControl: false,
        });
        map.addListener("idle", () => {
          const bounds = map.getBounds();
          if (!bounds) return;
          const northEast = bounds.getNorthEast();
          const southWest = bounds.getSouthWest();
          setViewport({
            bounds: `${southWest.lng()},${southWest.lat()},${northEast.lng()},${northEast.lat()}`,
            zoom: map.getZoom() ?? 12,
          });
        });
        mapInstance.current = map;
        markerClass.current = AdvancedMarkerElement;
        setMapReady(true);
      })
      .catch((error) => {
        if (!cancelled)
          setMapError(
            error instanceof Error
              ? error.message
              : "Không thể tải Google Maps",
          );
      });
    return () => {
      cancelled = true;
      stationMarkers.current.forEach((marker) => {
        marker.map = null;
      });
      stationMarkers.current = [];
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    const AdvancedMarkerElement = markerClass.current;
    if (!map || !AdvancedMarkerElement) return;
    stationMarkers.current.forEach((marker) => {
      marker.map = null;
    });
    stationMarkers.current = stationList.map((station) => {
      const content = document.createElement("button");
      content.className = "google-aqi-marker";
      content.type = "button";
      content.textContent = station.aqi === null ? "–" : String(station.aqi);
      content.style.background = color(station.aqi);
      content.title = station.name;
      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: station.latitude, lng: station.longitude },
        title: station.name,
        content,
      });
      marker.addListener("click", () => {
        const selected = { lat: station.latitude, lng: station.longitude };
        setCoords(selected);
        setActive(selected);
        setSelectedStation(station);
        map.moveCamera({ center: selected, zoom: 16 });
      });
      return marker;
    });
  }, [stationList, mapReady]);

  useEffect(() => {
    if (!selectedStation) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedStation(undefined);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedStation]);
  const value = current.data?.us_aqi ?? 0,
    level =
      value <= 50
        ? 0
        : value <= 100
          ? 1
          : value <= 150
            ? 2
            : value <= 200
              ? 3
              : value <= 300
                ? 4
                : 5;
  function submit(event: FormEvent) {
    event.preventDefault();
    setActive({ ...coords });
  }
  return (
    <div className="page air-quality-page">
      <div className="page-head">
        <div>
          <span className="kicker">KHÔNG KHÍ HÔM NAY</span>
          <h1>Chất lượng không khí</h1>
          <p>Open-Meteo và WAQI được gọi trực tiếp từ trình duyệt.</p>
        </div>
        <CloudSun size={48} />
      </div>
      <form className="coords" onSubmit={submit}>
        <label>
          Vĩ độ
          <input
            type="number"
            step="any"
            value={coords.lat}
            onChange={(e) => setCoords({ ...coords, lat: +e.target.value })}
          />
        </label>
        <label>
          Kinh độ
          <input
            type="number"
            step="any"
            value={coords.lng}
            onChange={(e) => setCoords({ ...coords, lng: +e.target.value })}
          />
        </label>
        <button className="btn primary">
          <MapPin size={17} />
          Xem dữ liệu
        </button>
      </form>
      <section className="aqi-map-card">
        <div className="aqi-map-heading">
          <div>
            <h2>Bản đồ trạm quan trắc</h2>
            <p>
              Di chuyển hoặc phóng to bản đồ để tải trạm WAQI trong khu vực.
            </p>
          </div>
          <span>
            {stations.isFetching
              ? "Đang cập nhật…"
              : `${stationList.length} trạm`}
          </span>
        </div>
        {stations.isError && (
          <div className="notice">
            Không thể tải trạm WAQI. Hãy kiểm tra VITE_WAQI_MAP_KEY.
          </div>
        )}
        {mapError && (
          <div className="notice">Không thể tải Google Maps: {mapError}</div>
        )}
        <div
          ref={mapElement}
          className="aqi-map"
          aria-label="Bản đồ trạm quan trắc không khí"
        />
        <section className="aqi-legend" aria-labelledby="aqi-legend-title">
          <div className="aqi-legend-heading">
            <div>
              <h3 id="aqi-legend-title">Chú giải chỉ số AQI</h3>
              <p>Màu sắc trên bản đồ thể hiện mức độ ảnh hưởng của chất lượng không khí.</p>
            </div>
            <span>US AQI</span>
          </div>
          <div className="aqi-legend-list">
            {[
              { range: "0–50", label: "Tốt", tone: "#35a853" },
              { range: "51–100", label: "Trung bình", tone: "#d8a719" },
              { range: "101–150", label: "Không tốt cho nhóm nhạy cảm", tone: "#e87825" },
              { range: "151–200", label: "Không tốt", tone: "#d6403a" },
              { range: "201–300", label: "Rất không tốt", tone: "#824b96" },
              { range: "301+", label: "Nguy hại", tone: "#7e2638" },
            ].map((item) => (
              <div className="aqi-legend-item" key={item.range}>
                <span className="aqi-legend-color" style={{ backgroundColor: item.tone }} aria-hidden="true" />
                <span><strong>{item.range}</strong><small>{item.label}</small></span>
              </div>
            ))}
          </div>
          <p className="aqi-legend-note"><span aria-hidden="true" /> Dấu màu xám hoặc ký hiệu “–” nghĩa là trạm chưa có dữ liệu.</p>
        </section>
        <small>Nguồn trạm: World Air Quality Index Project (WAQI).</small>
      </section>
      {selectedStation && (
        <div
          className="aqi-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedStation(undefined);
          }}
        >
          <article className="aqi-detail-modal" role="dialog" aria-modal="true" aria-labelledby="aqi-detail-title">
            <button className="aqi-detail-close" type="button" aria-label="Đóng thông tin trạm" onClick={() => setSelectedStation(undefined)}>
              <X size={20} />
            </button>
            <div className="aqi-detail-header" style={{ backgroundColor: color(selectedStation.aqi) }}>
              <span>Chỉ số AQI</span>
              <strong>{selectedStation.aqi ?? "–"}</strong>
              <small>{selectedStation.aqi === null ? "Chưa có dữ liệu" : category(selectedStation.aqi)}</small>
            </div>
            <div className="aqi-detail-body">
              <span className="kicker">TRẠM QUAN TRẮC</span>
              <h2 id="aqi-detail-title">{selectedStation.name}</h2>
              <div className="aqi-detail-location"><MapPin size={17} />{selectedStation.latitude.toFixed(5)}, {selectedStation.longitude.toFixed(5)}</div>
              <div className="aqi-detail-grid">
                <div><Activity /><span>AQI<strong>{selectedStation.aqi ?? "–"}</strong></span></div>
                <div><Wind /><span>PM2.5<strong>{current.isFetching ? "…" : current.data ? `${current.data.pm2_5} µg/m³` : "Không có"}</strong></span></div>
                <div><CloudSun /><span>PM10<strong>{current.isFetching ? "…" : current.data ? `${current.data.pm10} µg/m³` : "Không có"}</strong></span></div>
                <div><CalendarClock /><span>Cập nhật<strong>{selectedStation.measuredAt ? new Date(selectedStation.measuredAt).toLocaleString("vi-VN") : "Không rõ"}</strong></span></div>
              </div>
              {current.isError && <p className="aqi-detail-warning">Không thể tải thêm dữ liệu bụi mịn tại vị trí này.</p>}
              <small className="aqi-detail-source">Nguồn: WAQI và Open-Meteo</small>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
