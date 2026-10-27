import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Get,
  Query,
} from "@nestjs/common";
import { IsLatitude, IsLongitude } from "class-validator";
class AqiQuery {
  @IsLatitude() latitude!: number;
  @IsLongitude() longitude!: number;
}
type OpenMeteo = {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: { time: string; us_aqi: number; pm2_5: number; pm10: number };
  hourly?: { time: string[]; us_aqi: (number | null)[] };
};
@Controller("air-quality")
export class AirQualityController {
  @Get("stations") async stations(
    @Query("bounds") bounds: string,
    @Query("zoom") zoom = "12",
  ) {
    const parts = bounds?.split(",").map(Number);
    const zoomNumber = Number(zoom);
    if (
      !parts ||
      parts.length !== 4 ||
      parts.some((value) => !Number.isFinite(value)) ||
      !Number.isInteger(zoomNumber) ||
      zoomNumber < 1 ||
      zoomNumber > 20
    )
      throw new BadRequestException("Bounds hoặc zoom không hợp lệ");
    const [west, south, east, north] = parts;
    if (
      west < -180 ||
      east > 180 ||
      south < -90 ||
      north > 90 ||
      west >= east ||
      south >= north
    )
      throw new BadRequestException("Bounds không hợp lệ");
    const body = new FormData();
    body.set("bounds", parts.join(","));
    body.set("inc", "placeholders");
    body.set("viewer", "webgl");
    body.set("zoom", String(zoomNumber));
    body.set("country", "");
    body.set(
      "key",
      process.env.WAQI_MAP_KEY || "_2Y2EnVB92DRAfDQVCSDJWXmpNaEQ+LTcZFHg/Zw==",
    );
    try {
      const response = await fetch("https://mapq.waqi.info/mapq2/bounds", {
        method: "POST",
        body,
        headers: { Origin: "https://aqicn.org", Referer: "https://aqicn.org/" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error();
      const result = (await response.json()) as {
        status: string;
        data?: {
          idx: string;
          aqi: string | number;
          utime: string;
          geo: [number, number];
          name: string;
        }[];
      };
      if (result.status !== "ok" || !Array.isArray(result.data))
        throw new Error();
      return {
        stations: result.data.map((station) => ({
          idx: station.idx,
          aqi: Number.isFinite(Number(station.aqi))
            ? Number(station.aqi)
            : null,
          measuredAt: station.utime,
          latitude: station.geo[0],
          longitude: station.geo[1],
          name: station.name,
        })),
        source: "World Air Quality Index Project (WAQI)",
      };
    } catch {
      throw new BadGatewayException("Không thể tải dữ liệu trạm từ WAQI");
    }
  }
  @Get() async get(@Query() q: AqiQuery) {
    const url = new URL(
      "https://air-quality-api.open-meteo.com/v1/air-quality",
    );
    url.searchParams.set("latitude", String(q.latitude));
    url.searchParams.set("longitude", String(q.longitude));
    url.searchParams.set("current", "us_aqi,pm2_5,pm10");
    url.searchParams.set("hourly", "us_aqi");
    url.searchParams.set("past_hours", "24");
    url.searchParams.set("forecast_hours", "1");
    url.searchParams.set("timezone", "auto");
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error();
      const d = (await r.json()) as OpenMeteo;
      if (!d.current) throw new Error();
      return {
        location: { latitude: d.latitude, longitude: d.longitude },
        index: {
          system: "US_AQI",
          value: d.current.us_aqi,
          category: category(d.current.us_aqi),
          convention:
            "US EPA AQI: 0–50 tốt, 51–100 trung bình, 101–150 không tốt cho nhóm nhạy cảm, 151–200 không tốt, 201–300 rất không tốt, trên 300 nguy hại.",
        },
        pollutants: {
          pm2_5: d.current.pm2_5,
          pm10: d.current.pm10,
          unit: "μg/m³",
        },
        measuredAt: d.current.time,
        history:
          d.hourly?.time
            .map((time, i) => ({ time, value: d.hourly!.us_aqi[i] }))
            .filter((x) => x.value != null) || [],
        source: {
          provider: "Open-Meteo / CAMS global forecast",
          url: "https://open-meteo.com/en/docs/air-quality-api",
          kind: "Dữ liệu mô hình dự báo, không phải trạm đo vật lý",
        },
      };
    } catch {
      throw new BadGatewayException(
        "Không thể tải dữ liệu mô hình chất lượng không khí từ Open-Meteo",
      );
    }
  }
}
function category(v: number) {
  if (v <= 50) return "Tốt";
  if (v <= 100) return "Trung bình";
  if (v <= 150) return "Không tốt cho nhóm nhạy cảm";
  if (v <= 200) return "Không tốt";
  if (v <= 300) return "Rất không tốt";
  return "Nguy hại";
}
