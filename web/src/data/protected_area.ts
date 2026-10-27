export type ProtectedArea = {
  id: string;
  name: string;
  type: "National Park" | "Nature Reserve";
  established_year: number;
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
    location: {
      provinces: ["Đà Nẵng"],
      latitude: 16.1139,
      longitude: 108.2778,
    },
    details: {
      area_ha: 4370,
      description:
        "Nằm ở phía Đông Bắc thành phố Đà Nẵng, đây là hệ sinh thái rừng nhiệt đới mưa ẩm nguyên sinh đặc trưng ven biển độc đáo nhất Việt Nam, được ví như lá phổi xanh của thành phố và có vị trí chiến lược quan trọng về quốc phòng, an ninh.",
      endemic_species: ["Voọc chà vá chân nâu (Pygathrix nemaeus)"],
      endangered_species: [
        "Voọc chà vá chân nâu",
        "Cu li nhỏ (Nycticebus pygmaeus)",
        "Mèo rừng (Prionailurus bengalensis)",
      ],
    },
    images: [
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRGFGL0STI60f5o6KAu3S0o56evb1cW2X78C3hRr11ZOJBzfBx0N8vlKcA&s=10",
    ],
  },
  {
    id: "BT-BANANUICHUA-02",
    name: "Khu dự trữ thiên nhiên Bà Nà – Núi Chúa",
    type: "Nature Reserve",
    established_year: 1986,
    location: {
      provinces: ["Đà Nẵng"],
      latitude: 16.0333,
      longitude: 107.9167,
    },
    details: {
      area_ha: 8838,
      description:
        "Nằm ở phía Tây Nam của thành phố Đà Nẵng thuộc dãy Trung Trường Sơn. Nơi đây sở hữu khí hậu bốn mùa trong một ngày độc đáo cùng hệ sinh thái thảm thực vật á nhiệt đới nguyên sinh vô cùng đa dạng và có giá trị nguồn gen cao.",
      endemic_species: ["Chà la núi (Phoenix roebelenii)"],
      endangered_species: [
        "Gấu ngựa (Ursus thibetanus)",
        "Tê tê Java (Manis javanica)",
        "Trĩ sao (Rheinardia ocellata)",
        "Kiền kiền (Hopea pierrei)",
      ],
    },
    images: ["https://www.dongtayxanh.com/CustomFolder/images/ba-na-3.jpg "],
  },
  {
    id: "vqg-ba-be",
    name: "Vườn quốc gia Ba Bể",
    type: "National Park",
    established_year: 1992,
    location: {
      provinces: ["Bắc Kạn"],
      latitude: 22.4042,
      longitude: 105.6264,
    },
    details: {
      area_ha: 10048,
      description:
        "Nằm quanh Hồ Ba Bể - hồ nước ngọt tự nhiên lớn nhất Việt Nam trên núi đá vôi, thuộc danh sách Vườn di sản ASEAN.",
      endemic_species: ["Lan hài đặc hữu", "Cá lốc hồ Ba Bể"],
      endangered_species: [
        "Voọc mũi hếch (Rhinopithecus avunculus)",
        "Báo lửa",
        "Gấu ngựa",
      ],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-cat-ba",
    name: "Vườn quốc gia Cát Bà",
    type: "National Park",
    established_year: 1986,
    location: {
      provinces: ["Hải Phòng"],
      latitude: 20.8017,
      longitude: 106.9939,
    },
    details: {
      area_ha: 17367,
      description:
        "Khu dự trữ sinh quyển thế giới quần đảo Cát Bà, kết hợp đa dạng sinh học giữa hệ sinh thái rừng trên núi đá vôi và rừng ngập mặn quần đảo ven bờ.",
      endemic_species: [
        "Voọc Cát Bà (Pygathrix đầu trắng - Trachypithecus poliocephalus)",
      ],
      endangered_species: ["Sơn dương", "Khỉ vàng", "Thạch sùng mí Cát Bà"],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-tam-dao",
    name: "Vườn quốc gia Tam Đảo",
    type: "National Park",
    established_year: 1996,
    location: {
      provinces: ["Vĩnh Phúc", "Thái Nguyên", "Tuyên Quang"],
      latitude: 21.4644,
      longitude: 105.5564,
    },
    details: {
      area_ha: 34995,
      description:
        "Nằm trên dãy núi Tam Đảo có độ che phủ lớn, lá phổi xanh che chắn phía Bắc, có độ đa dạng côn trùng bậc nhất Việt Nam.",
      endemic_species: [
        "Cá cóc Tam Đảo (Paramesotriton deloustali)",
        "Rắn lục Tam Đảo",
      ],
      endangered_species: ["Gấu ngựa", "Báo gấm", "Khỉ mặt đỏ"],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-xuan-thuy",
    name: "Vườn quốc gia Xuân Thủy",
    type: "National Park",
    established_year: 2003,
    location: {
      provinces: ["Nam Định"],
      latitude: 20.2447,
      longitude: 106.5292,
    },
    details: {
      area_ha: 7100,
      description:
        "Khu Ramsar đầu tiên của Việt Nam và khu vực Đông Nam Á, vùng đất ngập nước cửa sông Ba Lạt hạ lưu sông Hồng.",
      endemic_species: ["Rong câu chỉ", "Trùn biển cửa sông"],
      endangered_species: [
        "Cò thìa mặt đen (Platalea minor)",
        "Rẽ mỏ thìa",
        "Bồ nông chân xám",
      ],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-pu-mat",
    name: "Vườn quốc gia Pù Mát",
    type: "National Park",
    established_year: 2001,
    location: {
      provinces: ["Nghệ An"],
      latitude: 18.9872,
      longitude: 104.7944,
    },
    details: {
      area_ha: 94804,
      description:
        "Vùng lõi Khu dự trữ sinh quyển miền Tây Nghệ An, một trong những trung tâm bảo tồn đa dạng sinh học lớn nhất dãy Trường Sơn.",
      endemic_species: ["Sao la", "Thỏ vằn Trường Sơn (Nesolagus timminsi)"],
      endangered_species: ["Vượn đen má trắng", "Cầy vằn Bắc", "Voi châu Á"],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-bach-ma",
    name: "Vườn quốc gia Bạch Mã",
    type: "National Park",
    established_year: 1991,
    location: {
      provinces: ["Thừa Thiên Huế", "Quảng Nam"],
      latitude: 16.2164,
      longitude: 107.8547,
    },
    details: {
      area_ha: 37487,
      description:
        "Nằm trên dải núi đứt gãy đèo Hải Vân kéo dài ra biển, nơi có khí hậu giao hòa đặc thù giữa hai miền khí hậu Nam - Bắc.",
      endemic_species: [
        "Trĩ sao (Rheinardia ocellata)",
        "Gà lôi lam đuôi trắng",
      ],
      endangered_species: ["Chà vá chân nâu", "Sao la", "Báo hoa mai"],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-song-thanh",
    name: "Vườn quốc gia Sông Thanh",
    type: "National Park",
    established_year: 2020,
    location: {
      provinces: ["Quảng Nam"],
      latitude: 15.5417,
      longitude: 107.4114,
    },
    details: {
      area_ha: 76516,
      description:
        "Chuyển hạng từ khu bảo tồn thiên nhiên lên vườn quốc gia, bảo vệ dải rừng rừng nhiệt đới thượng nguồn sông Thanh giáp biên giới Lào.",
      endemic_species: ["Chà vá chân xám (Pygathrix cinerea)"],
      endangered_species: ["Mang lớn", "Tê tê vàng", "Sao la"],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-kon-ka-kinh",
    name: "Vườn quốc gia Kon Ka Kinh",
    type: "National Park",
    established_year: 2002,
    location: {
      provinces: ["Gia Lai"],
      latitude: 14.3056,
      longitude: 108.3589,
    },
    details: {
      area_ha: 41780,
      description:
        "Nằm ở khu vực đỉnh cao của cao nguyên Pleiku, vườn di sản ASEAN có thảm thực vật hỗn giao cây lá rộng và lá kim quý hiếm.",
      endemic_species: [
        "Khướu Kon Ka Kinh (Garrulax konkakinhensis)",
        "Chà vá chân xám",
      ],
      endangered_species: ["Vượn má hung Bắc", "Hươu vàng", "Mèo gấm"],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-yok-don",
    name: "Vườn quốc gia Yok Đôn",
    type: "National Park",
    established_year: 1992,
    location: {
      provinces: ["Đắk Lắk", "Đắk Nông"],
      latitude: 12.8711,
      longitude: 107.7289,
    },
    details: {
      area_ha: 115545,
      description:
        "Vườn quốc gia có diện tích lớn thứ 2 Việt Nam, nơi duy nhất bảo tồn hệ sinh thái rừng khộp (rừng lá rộng rụng lá vào mùa khô) đặc trưng Đông Nam Á.",
      endemic_species: ["Lan hoàng thảo Yok Đôn", "Cây trắc Tây Nguyên"],
      endangered_species: [
        "Voi châu Á (Elephas maximus)",
        "Bò tót (Bos gaurus)",
        "Sếu đầu đỏ",
        "Chà vá chân đen",
      ],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-chu-yang-sin",
    name: "Vườn quốc gia Chư Yang Sin",
    type: "National Park",
    established_year: 2002,
    location: {
      provinces: ["Đắk Lắk"],
      latitude: 12.3967,
      longitude: 108.3494,
    },
    details: {
      area_ha: 58947,
      description:
        "Bao quanh đỉnh núi Chư Yang Sin cao nhất hệ thống núi Nam Trường Sơn, có tính phân hóa độ cao rất rõ rệt.",
      endemic_species: [
        "Khướu đầu đen",
        "Sẻ thông họng vàng",
        "Bách xanh núi đất",
      ],
      endangered_species: ["Sói lửa", "Báo hoa mai", "Vượn má hung"],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-bidoup-nui-ba",
    name: "Vườn quốc gia Bidoup Núi Bà",
    type: "National Park",
    established_year: 2004,
    location: {
      provinces: ["Lâm Đồng"],
      latitude: 12.1158,
      longitude: 108.5336,
    },
    details: {
      area_ha: 70038,
      description:
        "Một trong 4 trung tâm đa dạng sinh học lớn nhất Việt Nam. Nổi bật với rừng thông nguyên sinh cổ thụ nghìn năm tuổi và thế giới loài lan vô cùng phong phú.",
      endemic_species: [
        "Mi langbiang (Crocias langbianis)",
        "Thông hai lá dẹt (Pinus krempfii)",
      ],
      endangered_species: ["Cu li nhỏ", "Gấu chó", "Chà vá chân đen"],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-lo-go-xa-mat",
    name: "Vườn quốc gia Lò Gò - Xa Mát",
    type: "National Park",
    established_year: 2002,
    location: {
      provinces: ["Tây Ninh"],
      latitude: 11.5975,
      longitude: 105.8617,
    },
    details: {
      area_ha: 30022,
      description:
        "Khu vực biên giới Việt Nam - Campuchia. Có hệ thực vật chuyển tiếp vùng thấp giữa Tây Nguyên, Đông Nam Bộ và đồng bằng sông Cửu Long.",
      endemic_species: ["Dầu cát", "Mật cật Lò Gò"],
      endangered_species: ["Hạc cổ trắng", "Sếu đầu đỏ", "Chà vá chân đen"],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-con-dao",
    name: "Vườn quốc gia Côn Đảo",
    type: "National Park",
    established_year: 1993,
    location: {
      provinces: ["Bà Rịa - Vũng Tàu"],
      latitude: 8.6983,
      longitude: 106.6075,
    },
    details: {
      area_ha: 19998,
      description:
        "Vườn quốc gia bảo tồn kép cả hệ sinh thái rừng đặc dụng hải đảo và vùng bảo tồn biển rạn san hô, cỏ biển.",
      endemic_species: ["Sóc mun Côn Đảo", "Thạch sùng đuôi lằn Côn Đảo"],
      endangered_species: [
        "Bò biển (Dugong dugon)",
        "Vích / Rùa xanh (Chelonia mydas)",
        "Đồi mồi",
      ],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-mui-ca-mau",
    name: "Vườn quốc gia Mũi Cà Mau",
    type: "National Park",
    established_year: 2003,
    location: {
      provinces: ["Cà Mau"],
      latitude: 8.6253,
      longitude: 104.8311,
    },
    details: {
      area_ha: 41862,
      description:
        "Điểm tận cùng phía Tây Nam Tổ quốc, khu Ramsar thế giới lớn nhất về rừng ngập mặn tái sinh tự nhiên trên đất bồi lấn biển.",
      endemic_species: ["Đước đôi Cà Mau", "Cá thòi lòi khổng lồ"],
      endangered_species: [
        "Rái cá lông mượt (Lutrogale perspicillata)",
        "Bồ nông chân xám",
        "Khỉ đuôi dài",
      ],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "vqg-ea-so",
    name: "Vườn quốc gia Ea Sô",
    type: "National Park",
    established_year: 2026,
    location: {
      provinces: ["Đắk Lắk"],
      latitude: 12.9231,
      longitude: 108.6483,
    },
    details: {
      area_ha: 26900,
      description:
        "Vườn quốc gia mới nhất Việt Nam (chuyển hạng năm 2026 từ Khu bảo tồn thiên nhiên Ea Sô), sở hữu các thung lũng cỏ tranh và rừng rụng lá độc đáo.",
      endemic_species: ["Cẩm lai Ea Sô"],
      endangered_species: [
        "Bò tót",
        "Nai cà tông (Rucervus eldii)",
        "Gà tiền mặt đỏ",
      ],
    },
    images: ["https://wikimedia.org"],
  },
  {
    id: "kbttn-pu-luong",
    name: "Khu bảo tồn thiên nhiên Pù Luông",
    type: "Nature Reserve",
    established_year: 1999,
    location: {
      provinces: ["Thanh Hóa"],
      latitude: 20.4716,
      longitude: 105.1307,
    },
    details: {
      area_ha: 17662,
      description:
        "Khu bảo tồn với cảnh quan núi đá vôi, ruộng bậc thang và rừng nhiệt đới, là hành lang sinh thái quan trọng ở phía tây Thanh Hóa.",
      endemic_species: ["Thông Pà Cò", "Lan hài"],
      endangered_species: ["Voọc mông trắng", "Sơn dương", "Gấu ngựa"],
    },
    images: ["https://wikimedia.org"],
  },
];
