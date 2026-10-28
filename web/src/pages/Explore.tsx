import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Search,
  ShieldCheck,
  Trees,
  X,
} from "lucide-react";
import { protectedAreas, type ProtectedArea } from "../data/protected_area";
import { googleMapId, loadGoogleMaps } from "../google-maps";
import { listPollutionReports, type PollutionReport } from "../api";

const fallbackImage =
  "https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=900&auto=format&fit=crop";

export default function Explore() {
  const [query, setQuery] = useState("");
  const [detailArea, setDetailArea] = useState<ProtectedArea>();
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [pollutionReports, setPollutionReports] = useState<PollutionReport[]>([]);
  const [reportAlbum, setReportAlbum] = useState<PollutionReport[]>();
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerClass = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const reportMarkers = useRef<any[]>([]);

  useEffect(() => {
    listPollutionReports().then((items) => setPollutionReports(items.filter((item) => item.status === "APPROVED"))).catch(() => setPollutionReports([]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps()
      .then(async (google) => {
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([
          google.maps.importLibrary("maps"),
          google.maps.importLibrary("marker"),
        ]);
        if (cancelled || !mapElement.current) return;
        mapInstance.current = new Map(mapElement.current, {
          center: { lat: 16.0544, lng: 108.2022 },
          zoom: 10,
          mapId: googleMapId(),
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        markerClass.current = AdvancedMarkerElement;
        setMapReady(true);
        setMapError("");
      })
      .catch((error) => {
        if (!cancelled) {
          const reason = error instanceof Error ? ` (${error.message})` : "";
          setMapError(
            `Không thể tải Google Maps${reason}. Hãy kiểm tra giới hạn website của API key.`,
          );
        }
      });

    return () => {
      cancelled = true;
      markers.current.forEach((marker) => {
        marker.map = null;
      });
      markers.current = [];
      reportMarkers.current.forEach((marker) => { marker.map = null; });
      reportMarkers.current = [];
      mapInstance.current = null;
      markerClass.current = null;
    };
  }, []);
  useEffect(() => {
    if (!detailArea) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailArea(undefined);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [detailArea]);
  const filtered = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("vi");
    if (!value) return protectedAreas;
    return protectedAreas.filter((area) =>
      [
        area.name,
        ...area.location.provinces,
        ...area.details.endangered_species,
        ...area.details.endemic_species,
      ].some((text) => text.toLocaleLowerCase("vi").includes(value)),
    );
  }, [query]);

  useEffect(() => {
    const map = mapInstance.current;
    const AdvancedMarkerElement = markerClass.current;
    if (!map || !AdvancedMarkerElement) return;

    markers.current.forEach((marker) => {
      marker.map = null;
    });
    markers.current = filtered.map((area) => {
      const content = document.createElement("button");
      content.className = "google-park-marker";
      content.type = "button";
      content.title = area.name;
      content.setAttribute("aria-label", `Xem ${area.name}`);
      content.innerHTML =
        '<svg viewBox="0 0 40 50" aria-hidden="true"><path d="M20 1C9.5 1 1 9.5 1 20c0 14.3 19 29 19 29s19-14.7 19-29C39 9.5 30.5 1 20 1Z"/><circle cx="20" cy="20" r="7"/></svg>';
      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: area.location.latitude, lng: area.location.longitude },
        title: area.name,
        content,
      });
      marker.addListener("click", () => {
        map.panTo({
          lat: area.location.latitude,
          lng: area.location.longitude,
        });
        map.setZoom(10);
        setDetailArea(area);
      });
      return marker;
    });
  }, [filtered, mapReady]);

  useEffect(() => {
    const map = mapInstance.current;
    const AdvancedMarkerElement = markerClass.current;
    if (!map || !AdvancedMarkerElement) return;
    reportMarkers.current.forEach((marker) => { marker.map = null; });
    const groups = pollutionReports.reduce<Record<string, PollutionReport[]>>((result, report) => {
      const key = `${Number(report.latitude).toFixed(5)},${Number(report.longitude).toFixed(5)}`;
      (result[key] ||= []).push(report);
      return result;
    }, {});
    reportMarkers.current = Object.values(groups).map((album) => {
      const first = album[0];
      const content = document.createElement("button");
      content.className = "pollution-map-marker";
      content.type = "button";
      content.textContent = String(album.length);
      content.title = `${album.length} báo cáo ô nhiễm`;
      const marker = new AdvancedMarkerElement({ map, position: { lat: Number(first.latitude), lng: Number(first.longitude) }, content, title: content.title });
      marker.addListener("click", () => setReportAlbum(album));
      return marker;
    });
  }, [pollutionReports, mapReady]);

  return (
    <div className="explore-page map-screen">
      <div className="map-toolbar">
        <label className="search">
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm địa điểm"
            aria-label="Tìm khu bảo tồn"
          />
        </label>
        <span>{filtered.length} địa điểm</span>
      </div>
      <div
        ref={mapElement}
        className="map-screen-map"
        aria-label="Bản đồ các khu bảo tồn"
      />
      {mapError && (
        <div className="map-error" role="alert">
          {mapError}
        </div>
      )}
      {reportAlbum && (
        <div className="area-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setReportAlbum(undefined); }}>
          <article className="area-modal report-album" role="dialog" aria-modal="true" aria-labelledby="report-album-title">
            <button className="area-modal-close" type="button" aria-label="Đóng album" onClick={() => setReportAlbum(undefined)}><X /></button>
            <div className="area-modal-body">
              <h3 id="report-album-title">Album báo cáo ô nhiễm</h3>
              <p>{reportAlbum.length} báo cáo đã được giáo viên xác minh tại địa điểm này.</p>
              <div className="report-album-grid">{reportAlbum.flatMap((report) => report.imageUrls.map((url, index) => <a key={`${report.id}-${index}`} href={url} target="_blank" rel="noreferrer"><img src={url} alt={report.title}/><span>{report.title}</span></a>))}</div>
            </div>
          </article>
        </div>
      )}
      {detailArea && (
        <div
          className="area-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailArea(undefined);
          }}
        >
          <article
            className="area-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="area-modal-title"
          >
            <button
              className="area-modal-close"
              type="button"
              aria-label="Đóng chi tiết"
              onClick={() => setDetailArea(undefined)}
            >
              <X />
            </button>
            <div className="area-modal-cover">
              <img
                src={
                  detailArea.images[0]?.startsWith("https://wikimedia.org")
                    ? fallbackImage
                    : detailArea.images[0] || fallbackImage
                }
                alt=""
              />
              <span
                className={`map-type ${detailArea.type === "National Park" ? "national" : "reserve"}`}
              >
                {detailArea.type}
              </span>
            </div>
            <div className="area-modal-body">
              <div className="area-modal-heading">
                <div className="area-modal-heading-text">
                  <h3 id="area-modal-title">{detailArea.name}</h3>
                  <div className="area-modal-location">
                    <MapPin size={17} />
                    {detailArea.location.provinces.join(" · ")}
                  </div>
                </div>
              </div>
              <p className="area-modal-description">
                {detailArea.details.description}
              </p>
              <div className="area-modal-stats">
                <div>
                  <CalendarDays />
                  <span>
                    Thành lập<strong>{detailArea.established_year}</strong>
                  </span>
                </div>
                <div>
                  <Trees />
                  <span>
                    Diện tích
                    <strong>
                      {detailArea.details.area_ha.toLocaleString("vi-VN")} ha
                    </strong>
                  </span>
                </div>
                <div>
                  <MapPin />
                  <span>
                    Tọa độ
                    <strong>
                      {detailArea.location.latitude.toFixed(4)},{" "}
                      {detailArea.location.longitude.toFixed(4)}
                    </strong>
                  </span>
                </div>
              </div>
              <div className="area-modal-species">
                <section>
                  <h3>
                    <Trees /> Loài đặc hữu
                  </h3>
                  <div className="detail-species-list">
                    {detailArea.details.endemic_species.map((species) => (
                      <span key={species}>{species}</span>
                    ))}
                  </div>
                </section>
                <section className="danger">
                  <h3>
                    <ShieldCheck /> Loài nguy cấp
                  </h3>
                  <div className="detail-species-list">
                    {detailArea.details.endangered_species.map((species) => (
                      <span key={species}>{species}</span>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
