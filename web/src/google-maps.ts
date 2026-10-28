let googleMapsPromise: Promise<any> | undefined;

export function loadGoogleMaps() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (!apiKey) return Promise.reject(new Error("Thiếu VITE_GOOGLE_MAPS_API_KEY"));
  if ((window as any).google?.maps) return Promise.resolve((window as any).google);
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = "__greenBiologyGoogleMapsReady";
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      googleMapsPromise = undefined;
      reject(new Error("Google Maps phản hồi quá thời gian"));
    }, 15000);
    (window as any)[callbackName] = () => {
      window.clearTimeout(timeout);
      delete (window as any)[callbackName];
      resolve((window as any).google);
    };
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&libraries=marker&callback=${callbackName}&v=weekly`;
    script.async = true;
    script.onerror = () => {
      window.clearTimeout(timeout);
      delete (window as any)[callbackName];
      googleMapsPromise = undefined;
      reject(new Error("Không thể tải script Google Maps"));
    };
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}

export function googleMapId() {
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim();
  if (!mapId) throw new Error("Thiếu VITE_GOOGLE_MAPS_MAP_ID");
  return mapId;
}
