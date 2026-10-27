import { FormEvent, useState } from "react";
import { Leaf, LogIn, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "register" && password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") await register(username, password, name);
      else await login(username, password);
      navigate("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể xử lý tài khoản");
    } finally {
      setBusy(false);
    }
  }

  const registering = mode === "register";
  return <div className="login-page"><form className="login-card" onSubmit={submit}><div className="brand login-brand"><span><Leaf/></span><div>Green Biology<small>Khám phá sự sống</small></div></div><h1>{registering?"Tạo tài khoản":"Chào bạn trở lại"}</h1><p>{registering?"Tài khoản học sinh sẽ được lưu vào Google Sheets.":"Đăng nhập bằng tài khoản trong Google Sheets."}</p>{registering&&<label>Họ và tên<input value={name} onChange={event=>setName(event.target.value)} required minLength={2} maxLength={80} autoComplete="name"/></label>}<label>Tên đăng nhập<input value={username} onChange={event=>setUsername(event.target.value.toLowerCase())} required minLength={3} maxLength={40} pattern="[a-z0-9._-]+" autoComplete="username"/></label><label>Mật khẩu<input type="password" value={password} onChange={event=>setPassword(event.target.value)} required minLength={registering?6:1} autoComplete={registering?"new-password":"current-password"}/></label>{registering&&<label>Nhập lại mật khẩu<input type="password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} required minLength={6} autoComplete="new-password"/></label>}{error&&<div className="form-error">{error}</div>}<button className="btn primary" disabled={busy}>{registering?<UserPlus size={18}/>:<LogIn size={18}/>} {busy?"Đang xử lý…":registering?"Đăng ký":"Đăng nhập"}</button><button className="btn secondary" type="button" disabled={busy} onClick={()=>switchMode(registering?"login":"register")}>{registering?"Đã có tài khoản? Đăng nhập":"Chưa có tài khoản? Đăng ký"}</button></form></div>;
}
