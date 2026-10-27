import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  MapPin,
  Search,
  ShieldCheck,
  Trees,
  X,
} from "lucide-react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { protectedAreas, type ProtectedArea } from "../data/protected_area";

const markerIcon = divIcon({
  className: "custom-park-marker",
  html: '<svg viewBox="0 0 40 50" width="40" height="50" aria-hidden="true"><path d="M20 1C9.5 1 1 9.5 1 20c0 14.3 19 29 19 29s19-14.7 19-29C39 9.5 30.5 1 20 1Z" fill="#167b55" stroke="#fff" stroke-width="3"/><circle cx="20" cy="20" r="7" fill="#fff"/></svg>',
  iconSize: [40, 50],
  iconAnchor: [20, 49],
  popupAnchor: [0, -38],
});

const fallbackImage =
  "https://images.unsplash.com/photo-1528127269322-539801943592?q=80&w=900&auto=format&fit=crop";

function ParkMarker({
  area,
  onDetails,
}: {
  area: ProtectedArea;
  onDetails: (area: ProtectedArea) => void;
}) {
  const map = useMap();
  return (
    <Marker
      position={[area.location.latitude, area.location.longitude]}
      icon={markerIcon}
      eventHandlers={{
        click: () => {
          map.once("moveend", () => onDetails(area));
          map.flyTo([area.location.latitude, area.location.longitude], 10, {
            duration: 1,
          });
        },
      }}
    />
  );
}

export default function Explore() {
  const [query, setQuery] = useState("");
  const [detailArea, setDetailArea] = useState<ProtectedArea>();
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
      <MapContainer
        className="map-screen-map"
        center={[16.0544, 108.2022]}
        zoom={12}
        minZoom={4}
        scrollWheelZoom
        zoomControl
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filtered.map((area) => (
          <ParkMarker key={area.id} area={area} onDetails={setDetailArea} />
        ))}
      </MapContainer>
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
