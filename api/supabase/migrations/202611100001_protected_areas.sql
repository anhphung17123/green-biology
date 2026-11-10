create table if not exists public."ProtectedAreas" (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('National Park', 'Nature Reserve')),
  "establishedYear" integer not null check ("establishedYear" between 1800 and 2200),
  "googleMapsUrl" text not null,
  "mobileStreetViewUrl" text,
  provinces jsonb not null default '[]'::jsonb,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  "areaHa" double precision not null check ("areaHa" > 0),
  description text not null,
  "endemicSpecies" jsonb not null default '[]'::jsonb,
  "endangeredSpecies" jsonb not null default '[]'::jsonb,
  images jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists protected_areas_name_idx
  on public."ProtectedAreas" (name);

alter table public."ProtectedAreas" enable row level security;
revoke all on table public."ProtectedAreas" from anon, authenticated;

insert into public."ProtectedAreas" (
  name, type, "establishedYear", "googleMapsUrl", "mobileStreetViewUrl",
  provinces, latitude, longitude, "areaHa", description,
  "endemicSpecies", "endangeredSpecies", images
)
select
  seed.name, seed.type, seed.established_year, seed.maps_url,
  seed.mobile_url, seed.provinces, seed.latitude, seed.longitude,
  seed.area_ha, seed.description, seed.endemic_species,
  seed.endangered_species, '[]'::jsonb
from jsonb_to_recordset($seed$[
  {
    "name": "Khu bảo tồn thiên nhiên Sơn Trà",
    "type": "Nature Reserve",
    "established_year": 1977,
    "maps_url": "https://www.google.com/maps/search/?api=1&query=16.1207566,108.2648801",
    "mobile_url": "https://maps.app.goo.gl/npXa7B2387WHe71j7?g_st=az",
    "provinces": ["Đà Nẵng"],
    "latitude": 16.1207566,
    "longitude": 108.2648801,
    "area_ha": 4370,
    "description": "Nằm ở phía Đông Bắc thành phố Đà Nẵng, bán đảo Sơn Trà sở hữu hệ sinh thái rừng nhiệt đới mưa ẩm thường xanh, kết hợp hệ sinh thái biển ven bờ. Đây là khu vực có giá trị đa dạng sinh học cao, nổi bật với quần thể voọc chà vá chân nâu và cảnh quan rừng nguyên sinh.",
    "endemic_species": [],
    "endangered_species": ["Voọc chà vá chân nâu (Pygathrix nemaeus)", "Cu li nhỏ (Nycticebus pygmaeus)", "Mèo rừng (Prionailurus bengalensis)"]
  },
  {
    "name": "Khu dự trữ thiên nhiên Bà Nà – Núi Chúa",
    "type": "Nature Reserve",
    "established_year": 1986,
    "maps_url": "https://www.google.com/maps/search/?api=1&query=16.014428,107.9991326",
    "mobile_url": "https://maps.app.goo.gl/7Popdpho8g2NFHiP6?g_st=az",
    "provinces": ["Đà Nẵng"],
    "latitude": 16.014428,
    "longitude": 107.9991326,
    "area_ha": 8838,
    "description": "Nằm ở phía Tây thành phố Đà Nẵng, thuộc khu vực Trung Trường Sơn. Khu bảo tồn có địa hình núi cao, hệ sinh thái rừng nhiệt đới và á nhiệt đới phong phú, với nhiều loài động thực vật quý hiếm có giá trị bảo tồn và nguồn gen cao.",
    "endemic_species": [],
    "endangered_species": ["Gấu ngựa (Ursus thibetanus)", "Tê tê Java (Manis javanica)", "Trĩ sao (Rheinardia ocellata)", "Kiền kiền (Hopea pierrei)"]
  },
  {
    "name": "Khu dự trữ thiên nhiên Sao La",
    "type": "Nature Reserve",
    "established_year": 2013,
    "maps_url": "https://www.google.com/maps/search/?api=1&query=16.0830009,107.4915778",
    "mobile_url": null,
    "provinces": ["Huế"],
    "latitude": 16.0830009,
    "longitude": 107.4915778,
    "area_ha": 15519.93,
    "description": "Nằm ở khu vực phía Tây thành phố Huế, thuộc vùng núi Trung Trường Sơn. Khu dự trữ thiên nhiên Sao La được thành lập nhằm bảo tồn quần thể sao la, mang lớn, mang Trường Sơn và các hệ sinh thái rừng tự nhiên. Đây là khu vực có giá trị đa dạng sinh học cao, đóng vai trò quan trọng trong bảo vệ rừng đầu nguồn sông Hương và sông Bồ.",
    "endemic_species": [],
    "endangered_species": ["Sao la (Pseudoryx nghetinhensis)", "Mang lớn (Muntiacus vuquangensis)", "Mang Trường Sơn", "Thỏ vằn Trường Sơn (Nesolagus timminsi)"]
  },
  {
    "name": "Khu dự trữ thiên nhiên Đakrông",
    "type": "Nature Reserve",
    "established_year": 2001,
    "maps_url": "https://www.google.com/maps/search/?api=1&query=16.5698696,107.0581764",
    "mobile_url": null,
    "provinces": ["Quảng Trị"],
    "latitude": 16.5698696,
    "longitude": 107.0581764,
    "area_ha": 37841,
    "description": "Nằm trên địa bàn tỉnh Quảng Trị, thuộc khu vực Bắc Trường Sơn. Khu dự trữ thiên nhiên Đakrông có địa hình đồi núi thấp, độ dốc lớn và hệ sinh thái rừng nhiệt đới thường xanh đa dạng. Khu vực ghi nhận nhiều loài động thực vật quý hiếm, có vai trò quan trọng trong bảo tồn đa dạng sinh học và bảo vệ hệ sinh thái rừng tự nhiên.",
    "endemic_species": [],
    "endangered_species": ["Bò tót (Bos gaurus)", "Vượn má vàng Trung Bộ", "Mang lớn (Muntiacus vuquangensis)", "Thỏ vằn Trường Sơn (Nesolagus timminsi)", "Gấu ngựa (Ursus thibetanus)", "Voọc chà vá chân nâu (Pygathrix nemaeus)", "Cu li lớn (Nycticebus bengalensis)", "Sơn dương (Capricornis sumatraensis)"]
  }
]$seed$::jsonb) as seed(
  name text, type text, established_year integer, maps_url text,
  mobile_url text, provinces jsonb, latitude double precision,
  longitude double precision, area_ha double precision, description text,
  endemic_species jsonb, endangered_species jsonb
)
where not exists (select 1 from public."ProtectedAreas");
