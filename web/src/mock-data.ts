export const mockChallenges = [
  { id:"plant-tree",title:"Trồng một cây xanh",description:"Trồng và chăm sóc một cây phù hợp với nơi bạn sống.",points:20,endsAt:"2027-12-31",proofInstructions:"Ghi lại ảnh trước và sau khi trồng." },
  { id:"plastic-free",title:"Một ngày không nhựa dùng một lần",description:"Không sử dụng túi nylon, ly và ống hút nhựa trong một ngày.",points:15,endsAt:"2027-12-31",proofInstructions:"Liệt kê các vật dụng tái sử dụng bạn đã dùng." },
  { id:"biodiversity",title:"Quan sát đa dạng sinh học",description:"Ghi nhận năm loài sinh vật quanh trường hoặc nơi ở.",points:25,endsAt:"2027-12-31",proofInstructions:"Ghi tên hoặc chụp ảnh các loài quan sát được." },
];

export const mockLeaderboard = [
  { id:"1",name:"Nguyễn Minh Anh",points:120 },
  { id:"2",name:"Trần Gia Huy",points:95 },
  { id:"3",name:"Lê Khánh Linh",points:80 },
  { id:"4",name:"Phạm Hoàng Nam",points:65 },
];

export const mockTeacherStats = { students:32,teachers:2,reports:14,challenges:mockChallenges.length };
