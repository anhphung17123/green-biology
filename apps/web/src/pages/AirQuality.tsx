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
import { api } from "../api";

type Aqi = {
  location: { latitude: number; longitude: number };
  index: {
    system: string;
    value: number;
    category: string;
    convention: string;
  };
  pollutants: { pm2_5: number; pm10: number; unit: string };
  measuredAt: string;
  history: { time: string; value: number }[];
  source: { provider: string; url: string; kind: string };
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

function aqiColor(value: number | null) {
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
    html: `<span class="aqi-marker" style="background:${aqiColor(aqi)}">${aqi ?? "–"}</span>`,
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

export default function AirQuality() {
  const initial = { lat: 16.0544, lng: 108.2022 };
  const [coords, setCoords] = useState(initial);
  const [active, setActive] = useState(initial);
  const [viewport, setViewport] = useState<Viewport>({
    bounds:
      "108.0608367919922,15.970571298982348,108.35025787353517,16.168515928939254",
    zoom: 12,
  });
  const q = useQuery({
    queryKey: ["aqi", active],
    queryFn: () =>
      api<Aqi>(`/air-quality?latitude=${active.lat}&longitude=${active.lng}`),
  });
  const stations = useQuery({
    queryKey: ["aqi-stations", viewport],
    queryFn: () =>
      api<StationResponse>(
        `/air-quality/stations?bounds=${encodeURIComponent(viewport.bounds)}&zoom=${viewport.zoom}`,
      ),
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
          <p>
            Trạm quan trắc WAQI trên bản đồ và dữ liệu mô hình CAMS tại tọa độ
            đã chọn.
          </p>
        </div>
      </div>
      <form className="coords" onSubmit={submit}>
        <MapPin />
        <label>
          Vĩ độ
          <input
            type="number"
            step="any"
            value={coords.lat}
            onChange={(event) =>
              setCoords({ ...coords, lat: +event.target.value })
            }
          />
        </label>
        <label>
          Kinh độ
          <input
            type="number"
            step="any"
            value={coords.lng}
            onChange={(event) =>
              setCoords({ ...coords, lng: +event.target.value })
            }
          />
        </label>
        <button className="btn primary">Xem AQI</button>
      </form>

      <section className="aqi-map-card">
        <div className="aqi-map-heading">
          <div>
            <h2>Bản đồ trạm quan trắc</h2>
            <p>Rê hoặc phóng to bản đồ để tải các trạm trong khu vực.</p>
          </div>
          <span>
            {stations.isFetching ? "Đang cập nhật…" : `${markers.length} trạm`}
          </span>
        </div>
        {stations.isError && (
          <div className="notice">
            Không thể tải trạm WAQI. Hãy kiểm tra WAQI_MAP_KEY ở máy chủ.
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
        <p className="source-note">
          Dữ liệu trạm: World Air Quality Index Project (WAQI). Nền bản đồ:
          OpenStreetMap.
        </p>
      </section>

      {q.isLoading && <div className="empty">Đang tải dữ liệu Open‑Meteo…</div>}
      {q.isError && (
        <div className="notice">
          Không thể tải dữ liệu AQI. Không có giá trị thay thế giả.
        </div>
      )}
      {q.data && (
        <div className="aqi-grid">
          <article
            className={`aqi-card aqi-${Math.min(5, Math.floor(q.data.index.value / 50))}`}
          >
            <CloudSun />
            <span>{q.data.index.system}</span>
            <strong>{q.data.index.value}</strong>
            <h2>{q.data.index.category}</h2>
          </article>
          <article className="data-card">
            <h3>Thành phần</h3>
            <p>
              PM2.5{" "}
              <b>
                {q.data.pollutants.pm2_5} {q.data.pollutants.unit}
              </b>
            </p>
            <p>
              PM10{" "}
              <b>
                {q.data.pollutants.pm10} {q.data.pollutants.unit}
              </b>
            </p>
            <p>
              Thời điểm{" "}
              <b>{new Date(q.data.measuredAt).toLocaleString("vi-VN")}</b>
            </p>
          </article>
          <article className="data-card span2">
            <h3>Quy ước và nguồn</h3>
            <p>{q.data.index.convention}</p>
            <p>{q.data.source.kind}</p>
            <a href={q.data.source.url} target="_blank" rel="noreferrer">
              {q.data.source.provider}
            </a>
          </article>
        </div>
      )}
    </div>
  );
}
