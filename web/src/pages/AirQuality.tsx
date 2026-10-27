import { FormEvent, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CloudSun, MapPin } from "lucide-react";
import { divIcon, LatLngBounds } from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

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
function stationIcon(aqi: number | null) {
  return divIcon({
    className: "aqi-marker-shell",
    html: `<span class="aqi-marker" style="background:${color(aqi)}">${aqi ?? "–"}</span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -22],
  });
}
function BoundsWatcher({
  onChange,
}: {
  onChange: (viewport: Viewport) => void;
}) {
  const publish = (bounds: LatLngBounds, zoom: number) =>
    onChange({
      bounds: `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`,
      zoom,
    });
  const map = useMapEvents({
    load: () => publish(map.getBounds(), map.getZoom()),
    moveend: () => publish(map.getBounds(), map.getZoom()),
  });
  return null;
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
  const markers = useMemo(
    () =>
      stations.data?.stations.map((station) => ({
        ...station,
        icon: stationIcon(station.aqi),
      })) ?? [],
    [stations.data],
  );
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
      {current.isPending && <div className="notice">Đang tải dữ liệu AQI…</div>}
      {current.isError && (
        <div className="notice">Không thể tải dữ liệu AQI từ Open-Meteo.</div>
      )}
      {current.data && (
        <div className="aqi-grid">
          <article className={`aqi-card aqi-${level}`}>
            <span>US AQI</span>
            <strong>{current.data.us_aqi}</strong>
            <h2>{category(current.data.us_aqi)}</h2>
          </article>
          <article className="data-card">
            <h2>Bụi mịn</h2>
            <p>
              <span>PM2.5</span>
              <b>{current.data.pm2_5} μg/m³</b>
            </p>
            <p>
              <span>PM10</span>
              <b>{current.data.pm10} μg/m³</b>
            </p>
            <small>
              Cập nhật {new Date(current.data.time).toLocaleString("vi-VN")}
            </small>
          </article>
        </div>
      )}
      <section className="aqi-map-card">
        <div className="aqi-map-heading">
          <div>
            <h2>Bản đồ trạm quan trắc</h2>
            <p>
              Di chuyển hoặc phóng to bản đồ để tải trạm WAQI trong khu vực.
            </p>
          </div>
          <span>
            {stations.isFetching ? "Đang cập nhật…" : `${markers.length} trạm`}
          </span>
        </div>
        {stations.isError && (
          <div className="notice">
            Không thể tải trạm WAQI. Hãy kiểm tra VITE_WAQI_MAP_KEY.
          </div>
        )}
        <MapContainer
          center={[initial.lat, initial.lng]}
          zoom={12}
          minZoom={3}
          scrollWheelZoom
          className="aqi-map"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BoundsWatcher onChange={setViewport} />
          {markers.map((station) => (
            <Marker
              key={station.idx}
              position={[station.latitude, station.longitude]}
              icon={station.icon}
              eventHandlers={{
                click: () => {
                  const selected = {
                    lat: station.latitude,
                    lng: station.longitude,
                  };
                  setCoords(selected);
                  setActive(selected);
                },
              }}
            >
              <Popup>
                <div className="aqi-popup">
                  <strong>{station.name}</strong>
                  <span>AQI {station.aqi ?? "Chưa có dữ liệu"}</span>
                  <small>
                    {new Date(station.measuredAt).toLocaleString("vi-VN")}
                  </small>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <small>Nguồn trạm: World Air Quality Index Project (WAQI).</small>
      </section>
    </div>
  );
}
