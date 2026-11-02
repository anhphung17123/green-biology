export type ProtectedArea = {
  id: string;
  name: string;
  type: "National Park" | "Nature Reserve";
  established_year: number;
  googleMapsUrl: string;
  mobileStreetViewUrl?: string;
  location: { provinces: string[]; latitude: number; longitude: number };
  details: {
    area_ha: number;
    description: string;
    endemic_species: string[];
    endangered_species: string[];
  };
  images: string[];
};

export const protectedAreas: ProtectedArea[] = [
  {
    id: "BT-SONTRA-01",
    name: "Khu bảo tồn thiên nhiên Sơn Trà",
    type: "Nature Reserve",
    established_year: 1977,
    googleMapsUrl:
      "https://www.google.com/maps/place/S%C6%A1n+Tr%C3%A0+Nature+Reserve/@16.1207566,108.1124448,23655m/data=!3m1!1e3!4m10!1m2!2m1!1sNature+Reserve!3m6!1s0x31423d002421b683:0xb31daece4c27c815!8m2!3d16.1207566!4d108.2648801!15sCg5OYXR1cmUgUmVzZXJ2ZVoQIg5uYXR1cmUgcmVzZXJ2ZZIBD25hdHVyZV9wcmVzZXJ2ZZoBRENpOURRVWxSUVVOdlpFTm9kSGxqUmpsdlQyNUJOR0p0WkU1VmJEbDFaVU14TTAxV1dtMWhWR2haWTFSR1VWTklZeEFC4AEA-gEECAAQLw!16s%2Fg%2F11xg5p_8pw?entry=ttu",
    mobileStreetViewUrl: "https://maps.app.goo.gl/npXa7B2387WHe71j7?g_st=az",
    location: {
      provinces: ["Đà Nẵng"],
      latitude: 16.1207566,
      longitude: 108.2648801,
    },
    details: {
      area_ha: 4370,
      description:
        "Nằm ở phía Đông Bắc thành phố Đà Nẵng, bán đảo Sơn Trà sở hữu hệ sinh thái rừng nhiệt đới mưa ẩm thường xanh, kết hợp hệ sinh thái biển ven bờ. Đây là khu vực có giá trị đa dạng sinh học cao, nổi bật với quần thể voọc chà vá chân nâu và cảnh quan rừng nguyên sinh.",
      endemic_species: [],
      endangered_species: [
        "Voọc chà vá chân nâu (Pygathrix nemaeus)",
        "Cu li nhỏ (Nycticebus pygmaeus)",
        "Mèo rừng (Prionailurus bengalensis)",
      ],
    },
    images: [],
  },
  {
    id: "BT-BANANUICHUA-02",
    name: "Khu dự trữ thiên nhiên Bà Nà – Núi Chúa",
    type: "Nature Reserve",
    established_year: 1986,
    googleMapsUrl:
      "https://www.google.com/maps/place/B%C3%A0+N%C3%A0+N%C3%BAi+Ch%C3%BAa+Nature+Reserve/@16.014428,107.8466973,23668m/data=!3m1!1e3!4m10!1m2!2m1!1sNature+Reserve!3m6!1s0x3141f7001b9ce419:0x461fc081d1ce8d04!8m2!3d16.014428!4d107.9991326!15sCg5OYXR1cmUgUmVzZXJ2ZZIBD25hdHVyZV9wcmVzZXJ2ZeABAA!16s%2Fg%2F11yczn2qwy?entry=ttu",
    mobileStreetViewUrl: "https://maps.app.goo.gl/7Popdpho8g2NFHiP6?g_st=az",
    location: {
      provinces: ["Đà Nẵng"],
      latitude: 16.014428,
      longitude: 107.9991326,
    },
    details: {
      area_ha: 8838,
      description:
        "Nằm ở phía Tây thành phố Đà Nẵng, thuộc khu vực Trung Trường Sơn. Khu bảo tồn có địa hình núi cao, hệ sinh thái rừng nhiệt đới và á nhiệt đới phong phú, với nhiều loài động thực vật quý hiếm có giá trị bảo tồn và nguồn gen cao.",
      endemic_species: [],
      endangered_species: [
        "Gấu ngựa (Ursus thibetanus)",
        "Tê tê Java (Manis javanica)",
        "Trĩ sao (Rheinardia ocellata)",
        "Kiền kiền (Hopea pierrei)",
      ],
    },
    images: [],
  },
  {
    id: "BT-SAOLA-HUE-03",
    name: "Khu dự trữ thiên nhiên Sao La",
    type: "Nature Reserve",
    established_year: 2013,
    googleMapsUrl:
      "https://www.google.com/maps/place/Khu+b%E1%BA%A3o+t%E1%BB%93n+lo%C3%A0i+-+sinh+c%E1%BA%A3nh+Sao+La+-+Th%E1%BB%ABa+Thi%C3%AAn+Hu%E1%BA%BF/@16.0830009,107.3391425,23660m/data=!3m1!1e3!4m10!1m2!2m1!1za2h1IGLhuqNvIHThu5NuIHRoacOqbiBuaGnDqm4!3m6!1s0x3141c7a092537775:0x2d5cea928c00bb0e!8m2!3d16.0830009!4d107.4915778!15sCh1raHUgYuG6o28gdOG7k24gdGhpw6puIG5oacOqbpIBD25hdHVyZV9wcmVzZXJ2ZeABAA!16s%2Fg%2F11g1kt2b9n?entry=ttu",
    location: {
      provinces: ["Huế"],
      latitude: 16.0830009,
      longitude: 107.4915778,
    },
    details: {
      area_ha: 15519.93,
      description:
        "Nằm ở khu vực phía Tây thành phố Huế, thuộc vùng núi Trung Trường Sơn. Khu dự trữ thiên nhiên Sao La được thành lập nhằm bảo tồn quần thể sao la, mang lớn, mang Trường Sơn và các hệ sinh thái rừng tự nhiên. Đây là khu vực có giá trị đa dạng sinh học cao, đóng vai trò quan trọng trong bảo vệ rừng đầu nguồn sông Hương và sông Bồ.",
      endemic_species: [],
      endangered_species: [
        "Sao la (Pseudoryx nghetinhensis)",
        "Mang lớn (Muntiacus vuquangensis)",
        "Mang Trường Sơn",
        "Thỏ vằn Trường Sơn (Nesolagus timminsi)",
      ],
    },
    images: [],
  },
  {
    id: "BT-DAKRONG-04",
    name: "Khu dự trữ thiên nhiên Đakrông",
    type: "Nature Reserve",
    established_year: 2001,
    googleMapsUrl:
      "https://www.google.com/maps/place/Khu+b%E1%BA%A3o+t%E1%BB%93n+thi%C3%AAn+nhi%C3%AAn+%C4%90%C4%83kr%C3%B4ng/@16.515858,107.1235425,23607m/data=!3m1!1e3!4m10!1m2!2m1!1za2h1IGLhuqNvIHThu5NuIHRoacOqbiBuaGnDqm4!3m6!1s0x31405900365f7305:0xa57dc1487a57454!8m2!3d16.5698696!4d107.0581764!15sCh1raHUgYuG6o28gdOG7k24gdGhpw6puIG5oacOqbpIBEG5hdGlvbmFsX3Jlc2VydmXgAQA!16s%2Fg%2F11yd04cy_3?entry=ttu",
    location: {
      provinces: ["Quảng Trị"],
      latitude: 16.5698696,
      longitude: 107.0581764,
    },
    details: {
      area_ha: 37841,
      description:
        "Nằm trên địa bàn tỉnh Quảng Trị, thuộc khu vực Bắc Trường Sơn. Khu dự trữ thiên nhiên Đakrông có địa hình đồi núi thấp, độ dốc lớn và hệ sinh thái rừng nhiệt đới thường xanh đa dạng. Khu vực ghi nhận nhiều loài động thực vật quý hiếm, có vai trò quan trọng trong bảo tồn đa dạng sinh học và bảo vệ hệ sinh thái rừng tự nhiên.",
      endemic_species: [],
      endangered_species: [
        "Bò tót (Bos gaurus)",
        "Vượn má vàng Trung Bộ",
        "Mang lớn (Muntiacus vuquangensis)",
        "Thỏ vằn Trường Sơn (Nesolagus timminsi)",
        "Gấu ngựa (Ursus thibetanus)",
        "Voọc chà vá chân nâu (Pygathrix nemaeus)",
        "Cu li lớn (Nycticebus bengalensis)",
        "Sơn dương (Capricornis sumatraensis)",
      ],
    },
    images: [],
  },
];
