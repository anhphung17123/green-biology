import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  ExternalLink,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Trees,
  X,
} from "lucide-react";
import { protectedAreas as fallbackProtectedAreas, type ProtectedArea } from "../data/protected_area";
import { googleMapId, loadGoogleMaps } from "../google-maps";
import {
  listPollutionReports,
  listProtectedAreas,
  type PollutionReport,
  type ProtectedAreaRecord,
} from "../api";

function toProtectedArea(area: ProtectedAreaRecord): ProtectedArea {
  return {
    id: area.id,
    name: area.name,
    type: area.type,
    established_year: area.establishedYear,
    googleMapsUrl: area.googleMapsUrl,
    mobileStreetViewUrl: area.mobileStreetViewUrl || undefined,
    location: {
      provinces: area.provinces,
      latitude: area.latitude,
      longitude: area.longitude,
    },
    details: {
      area_ha: area.areaHa,
      description: area.description,
      endemic_species: area.endemicSpecies,
      endangered_species: area.endangeredSpecies,
    },
    images: area.images,
  };
}

const fallbackImage =
  "https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=900&auto=format&fit=crop";

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.matchMedia("(max-width: 900px)").matches);
}

function openAreaInGoogleMaps(area: ProtectedArea) {
  if (isMobileDevice()) {
    window.location.assign(area.mobileStreetViewUrl ?? area.googleMapsUrl);
    return;
  }

  window.open(area.googleMapsUrl, "_blank", "noopener,noreferrer");
}

export default function Explore() {
  const [protectedAreas, setProtectedAreas] = useState<ProtectedArea[]>(fallbackProtectedAreas);
  const [query, setQuery] = useState("");
  const [mapFilter, setMapFilter] = useState<"reserve" | "report">("reserve");
  const [filterOpen, setFilterOpen] = useState(true);
  const [selectedReport, setSelectedReport] = useState<PollutionReport>();
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
    Promise.all([
      listPollutionReports().then((items) => setPollutionReports(items.filter((item) => item.status === "APPROVED"))),
      listProtectedAreas().then((items) => setProtectedAreas(items.map(toProtectedArea))),
    ]).catch(() => undefined);
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
  }, [protectedAreas, query]);
  const filteredReports = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("vi");
    if (!value) return pollutionReports;
    return pollutionReports.filter((report) =>
      [report.title, report.description, report.incidentType, report.studentName].some(
        (text) => text.toLocaleLowerCase("vi").includes(value),
      ),
    );
  }, [pollutionReports, query]);

  useEffect(() => {
    const map = mapInstance.current;
    const AdvancedMarkerElement = markerClass.current;
    if (!map || !AdvancedMarkerElement) return;

    markers.current.forEach((marker) => {
      marker.map = null;
    });
    if (mapFilter !== "reserve") {
      markers.current = [];
      return;
    }
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
  }, [filtered, mapFilter, mapReady]);

  useEffect(() => {
    const map = mapInstance.current;
    const AdvancedMarkerElement = markerClass.current;
    if (!map || !AdvancedMarkerElement) return;
    reportMarkers.current.forEach((marker) => { marker.map = null; });
    if (mapFilter !== "report" || !selectedReport) {
      reportMarkers.current = [];
      return;
    }
    const report = selectedReport;
      const content = document.createElement("button");
      content.className = "pollution-map-marker";
      content.type = "button";
      content.innerHTML = '<span aria-hidden="true">!</span>';
      content.title = report.title;
      const marker = new AdvancedMarkerElement({
        map,
        position: { lat: Number(report.latitude), lng: Number(report.longitude) },
        content,
        title: report.title,
      });
      marker.addListener("click", () => setReportAlbum([report]));
      reportMarkers.current = [marker];
  }, [mapFilter, mapReady, selectedReport]);

  function selectFilter(filter: "reserve" | "report") {
    setMapFilter(filter);
    setQuery("");
    setDetailArea(undefined);
    setReportAlbum(undefined);
    if (filter === "reserve") setSelectedReport(undefined);
  }

  function showReportOnMap(report: PollutionReport) {
    setSelectedReport(report);
    setReportAlbum(undefined);
    const map = mapInstance.current;
    if (map) {
      map.panTo({ lat: Number(report.latitude), lng: Number(report.longitude) });
      map.setZoom(15);
    }
  }

  return (
    <div className="explore-page map-screen">
      <div className="map-toolbar">
        <label className="search">
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={mapFilter === "reserve" ? "Tìm khu bảo tồn" : "Tìm báo cáo"}
            aria-label={mapFilter === "reserve" ? "Tìm khu bảo tồn" : "Tìm báo cáo"}
          />
        </label>
        <span>{mapFilter === "reserve" ? `${filtered.length} địa điểm` : `${filteredReports.length} báo cáo`}</span>
      </div>
      <div
        ref={mapElement}
        className="map-screen-map"
        aria-label="Bản đồ khám phá khu bảo tồn và báo cáo môi trường"
      />
      {mapError && (
        <div className="map-error" role="alert">
          {mapError}
        </div>
      )}
      {!filterOpen && (
        <button className="map-filter-toggle" type="button" onClick={() => setFilterOpen(true)} aria-expanded="false" aria-controls="map-filter-panel">
          <SlidersHorizontal size={19} />
          Bộ lọc
        </button>
      )}
      {filterOpen && <aside id="map-filter-panel" className="map-filter-panel" aria-label="Bộ lọc bản đồ">
        <div className="map-filter-heading">
          <div>
            <span className="kicker">KHÁM PHÁ</span>
            <h2>Lớp dữ liệu</h2>
          </div>
          <button type="button" onClick={() => setFilterOpen(false)} aria-label="Đóng bộ lọc" title="Thu gọn bộ lọc">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="map-filter-options" role="tablist" aria-label="Chọn loại dữ liệu">
          <button type="button" role="tab" aria-selected={mapFilter === "reserve"} className={mapFilter === "reserve" ? "active" : ""} onClick={() => selectFilter("reserve")}>
            <Trees size={18} /> Khu bảo tồn
          </button>
          <button type="button" role="tab" aria-selected={mapFilter === "report"} className={mapFilter === "report" ? "active report" : ""} onClick={() => selectFilter("report")}>
            <TriangleAlert size={18} /> Báo cáo
          </button>
        </div>
        <div className="map-filter-list" role="tabpanel">
          {mapFilter === "reserve" ? (
            <>
              <p className="map-filter-summary">Hiển thị {filtered.length} khu bảo tồn trên bản đồ.</p>
              {filtered.map((area) => (
                <button className="map-list-item" type="button" key={area.id} onClick={() => {
                  setDetailArea(area);
                  mapInstance.current?.panTo({ lat: area.location.latitude, lng: area.location.longitude });
                  mapInstance.current?.setZoom(10);
                }}>
                  <span className="map-list-icon reserve"><Trees size={17} /></span>
                  <span><strong>{area.name}</strong><small>{area.location.provinces.join(" · ")}</small></span>
                </button>
              ))}
            </>
          ) : (
            <>
              <p className="map-filter-summary">Chọn một báo cáo để hiển thị vị trí trên bản đồ.</p>
              {filteredReports.length === 0 && <p className="map-filter-empty">Không tìm thấy báo cáo phù hợp.</p>}
              {filteredReports.map((report) => (
                <button className={`map-list-item report ${selectedReport?.id === report.id ? "selected" : ""}`} type="button" key={report.id} onClick={() => showReportOnMap(report)}>
                  {report.imageUrls[0] ? <img src={report.imageUrls[0]} alt="" /> : <span className="map-list-icon report"><TriangleAlert size={17} /></span>}
                  <span><strong>{report.title}</strong><small>{report.incidentType} · {report.studentName}</small></span>
                  <MapPin size={16} />
                </button>
              ))}
            </>
          )}
        </div>
      </aside>}
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
              <button
                className="area-modal-learn-more"
                type="button"
                onClick={() => openAreaInGoogleMaps(detailArea)}
                aria-label={`Tìm hiểu thêm về ${detailArea.name} trên Google Maps`}
              >
                <MapPin size={19} />
                Tìm hiểu thêm
                <ExternalLink size={17} />
              </button>
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
