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

const fallbackImage =
  "https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=900&auto=format&fit=crop";

export default function Explore() {
  const [query, setQuery] = useState("");
  const [detailArea, setDetailArea] = useState<ProtectedArea>();
  const [mapError, setMapError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerClass = useRef<any>(null);
  const markers = useRef<any[]>([]);

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
