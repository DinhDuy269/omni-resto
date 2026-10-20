import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiRequestError, loginCustomer } from "../../services/authService";
import "../register/register.css"; // dùng lại giao diện của trang đăng ký

export default function LoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState("");

  const set = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setErrors({ ...errors, [name]: undefined });
  };

  const submit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setServerMsg("");

    const v: typeof errors = {};
    if (!form.identifier.trim()) v.identifier = "Vui lòng nhập email hoặc số điện thoại";
    if (!form.password) v.password = "Vui lòng nhập mật khẩu";
    setErrors(v);
    if (Object.keys(v).length) return;

    setLoading(true);
    try {
      const customer = await loginCustomer({ identifier: form.identifier.trim(), password: form.password });
      localStorage.setItem("customer", JSON.stringify(customer)); // lưu tạm thông tin khách đã đăng nhập
      navigate("/client");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setServerMsg(
          err.status === 401 || err.status === 400
            ? "Email/số điện thoại hoặc mật khẩu không đúng"
            : err.message
        );
      } else {
        setServerMsg("Không kết nối được máy chủ. Kiểm tra backend đã chạy ở cổng 8080 chưa.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="rg-page">
      <aside className="rg-brand">
        <div className="rg-logo">OmniResto</div>
        <h2>Chào mừng bạn quay lại.</h2>
        <p>Đăng nhập để xem điểm tích lũy và nhận ưu đãi dành cho thành viên.</p>
      </aside>

      <section className="rg-formwrap">
        <form className="rg-card" onSubmit={submit} noValidate>
          <h1>Đăng nhập</h1>
          <p className="rg-sub">Dùng email hoặc số điện thoại bạn đã đăng ký.</p>

          {serverMsg && <div className="rg-alert" role="alert">{serverMsg}</div>}

          <div className={"rg-field" + (errors.identifier ? " has-error" : "")}>
            <label htmlFor="identifier">Email hoặc số điện thoại</label>
            <input id="identifier" name="identifier" value={form.identifier} onChange={set}
              autoComplete="username" placeholder="ban@example.com" />
            {errors.identifier && <p className="rg-error">{errors.identifier}</p>}
          </div>

          <div className={"rg-field" + (errors.password ? " has-error" : "")}>
            <label htmlFor="password">Mật khẩu</label>
            <div className="rg-pw">
              <input id="password" name="password" type={showPw ? "text" : "password"}
                value={form.password} onChange={set} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPw(!showPw)} aria-pressed={showPw}>
                {showPw ? "Ẩn" : "Hiện"}
              </button>
            </div>
            {errors.password && <p className="rg-error">{errors.password}</p>}
          </div>

          <button className="rg-btn" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>

          <p className="rg-hint" style={{ textAlign: "center", margin: "18px 0 0" }}>
            Chưa có tài khoản?{" "}
            <Link to="/register" style={{ color: "#2563eb", fontWeight: 600 }}>Đăng ký thành viên</Link>
          </p>
        </form>
      </section>
    </main>
  );
}