import { useState, type ReactNode } from "react";
import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import {
  BookOpen,
  Bot,
  Camera,
  CloudSun,
  Flag,
  FolderClock,
  Gamepad2,
  House,
  LayoutDashboard,
  Leaf,
  LogIn,
  LogOut,
  Map,
  Menu,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "./auth";
import AirQuality from "./pages/AirQuality";
import Challenges from "./pages/Challenges";
import Chat from "./pages/Chat";
import Explore from "./pages/Explore";
import Games from "./pages/Games";
import Home from "./pages/Home";
import Leaderboard from "./pages/Leaderboard";
import Login from "./pages/Login";
import Magazine from "./pages/Magazine";
import Recognition from "./pages/Recognition";
import Reports from "./pages/Reports";
import Teacher from "./pages/Teacher";
import MyActivities from "./pages/MyActivities";

type NavigationItem = {
  to: string;
  icon: typeof House;
  label: string;
  requiresAuth?: boolean;
};
const navigationGroups: { label: string; items: NavigationItem[] }[] = [
  {
    label: "Tổng quan",
    items: [
      { to: "/", icon: House, label: "Trang chủ" },
      { to: "/explore", icon: Map, label: "Khám phá" },
      { to: "/air-quality", icon: CloudSun, label: "Không khí" },
    ],
  },
  {
    label: "Học tập",
    items: [
      { to: "/games", icon: Gamepad2, label: "Trò chơi" },
      {
        to: "/recognition",
        icon: Camera,
        label: "Nhận diện",
        requiresAuth: true,
      },
      { to: "/chat", icon: Bot, label: "Hỏi AI" },
      { to: "/magazine", icon: BookOpen, label: "Tạp chí" },
    ],
  },
  {
    label: "Cộng đồng",
    items: [
      { to: "/challenges", icon: Trophy, label: "Thử thách" },
      { to: "/leaderboard", icon: Users, label: "Xếp hạng" },
      { to: "/reports", icon: Flag, label: "Báo cáo", requiresAuth: true },
    ],
  },
];
function Protected({
  children,
  role,
}: {
  children: ReactNode;
  role?: "TEACHER";
}) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page empty">Đang tải…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <aside className={open ? "open" : ""}>
        <div className="brand">
          <span>
            <Leaf />
          </span>
          <div>
            Green Biology<small>Khám phá sự sống</small>
          </div>
        </div>
        <div className="sidebar-navigation">
          {user?.role === "TEACHER" && (
            <div className="nav-group teacher-navigation">
              <div className="nav-label">Giảng dạy</div>
              <nav>
                <NavLink to="/teacher" onClick={() => setOpen(false)}>
                  <LayoutDashboard size={19} />
                  <span>Quản lý nội dung</span>
                </NavLink>
              </nav>
            </div>
          )}
          {user?.role === "STUDENT" && (
            <div className="nav-group teacher-navigation">
              <div className="nav-label">Cá nhân</div>
              <nav><NavLink to="/my-activities" onClick={() => setOpen(false)}><FolderClock size={19}/><span>Hoạt động của tôi</span></NavLink></nav>
            </div>
          )}
          {navigationGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.requiresAuth || user,
            );
            if (!visibleItems.length) return null;
            return (
              <div className="nav-group" key={group.label}>
                <div className="nav-label">{group.label}</div>
                <nav>
                  {visibleItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) => (isActive ? "active" : "")}
                    >
                      <Icon size={19} />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </nav>
              </div>
            );
          })}
        </div>
        <div className="eco-note">
          <Sparkles size={17} />
          <div>
            <strong>Mỗi khám phá nhỏ</strong>
            <span>nuôi dưỡng một tương lai xanh.</span>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div className="header-start">
            <div className="crumb">
              <Leaf size={14} /> Nền tảng học tập sinh học
            </div>
          </div>
          {user ? (
            <div className="profile">
              <span>{user.name.slice(0, 2).toUpperCase()}</span>
              <div>
                {user.name}
                <small>
                  {user.role === "TEACHER"
                    ? "Giáo viên"
                    : `${user.points} điểm xanh`}
                </small>
              </div>
              <button
                className="icon-button"
                onClick={logout}
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <NavLink className="btn secondary" to="/login">
              <LogIn size={17} />
              Đăng nhập
            </NavLink>
          )}
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/air-quality" element={<AirQuality />} />
          <Route
            path="/reports"
            element={
              <Protected>
                <Reports />
              </Protected>
            }
          />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/games" element={<Games />} />
          <Route path="/chat" element={<Chat />} />
          <Route
            path="/recognition"
            element={
              <Protected>
                <Recognition />
              </Protected>
            }
          />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/magazine" element={<Magazine />} />
          <Route path="/my-activities" element={<Protected><MyActivities /></Protected>} />
          <Route
            path="/teacher"
            element={
              <Protected role="TEACHER">
                <Teacher />
              </Protected>
            }
          />
        </Routes>
      </main>
      {open && (
        <button
          className="scrim"
          aria-label="Đóng menu"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
