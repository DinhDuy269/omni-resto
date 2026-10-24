import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ApiRequestError, registerCustomer } from "../../services/authService";
import type { CustomerResponse } from "../../../shared/types/customer";
import "./register.css";

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
}

type Errors = Record<string, string | undefined>;

const TIERS = [
  { name: "Tiêu chuẩn", note: "Bạn bắt đầu ở đây" },
  { name: "Bạc", note: "Tích điểm để lên hạng" },
  { name: "Vàng", note: "Nhiều ưu đãi hơn" },
  { name: "Bạch kim", note: "Hạng cao nhất" },
];

const EMPTY: FormState = { fullName: "", email: "", phone: "", dateOfBirth: "", password: "", confirmPassword: "" };

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (!f.fullName.trim()) e.fullName = "Vui lòng nhập họ tên";
  if (!f.email.trim()) e.email = "Vui lòng nhập email";
  else if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Email không hợp lệ";
  if (!f.phone.trim()) e.phone = "Vui lòng nhập số điện thoại";
  else if (!/^(0|\+84)[35789]\d{8}$/.test(f.phone)) e.phone = "Số điện thoại không hợp lệ (ví dụ: 0912345678)";
  if (!f.dateOfBirth) e.dateOfBirth = "Vui lòng chọn ngày sinh (thông tin bắt buộc)";
  else if (new Date(f.dateOfBirth) >= new Date()) e.dateOfBirth = "Ngày sinh phải ở trong quá khứ";
  if (f.password.length < 8) e.password = "Mật khẩu cần ít nhất 8 ký tự";
  else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = "Mật khẩu cần có cả chữ và số";
  if (f.confirmPassword !== f.password) e.confirmPassword = "Mật khẩu nhập lại không khớp";
  return e;
}

interface FieldProps {
  label: string;
  name: string;
  error?: string;
  children: ReactNode;
}

function Field({ label, name, error, children }: FieldProps) {
  return (
    <div className={"rg-field" + (error ? " has-error" : "")}>
      <label htmlFor={name}>{label}</label>
      {children}
      {error && <p className="rg-error" id={name + "-err"}>{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState("");
  const [done, setDone] = useState<CustomerResponse | null>(null);

  const set = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: undefined });
  };

  const submit = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    setServerMsg("");
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    setLoading(true);
    try {
      const res = await registerCustomer({
        full_name: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        date_of_birth: form.dateOfBirth,
      });
      if (res.token) {
        localStorage.setItem("token", res.token);
      }
      localStorage.setItem("customer", JSON.stringify(res));
      setDone(res);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.status === 400 && err.fieldErrors) {
          const mapped: Errors = { ...err.fieldErrors };
          if (mapped.full_name) mapped.fullName = mapped.full_name;
          if (mapped.date_of_birth) mapped.dateOfBirth = mapped.date_of_birth;
          if (mapped.passwordConfirmed) mapped.confirmPassword = mapped.passwordConfirmed;
          return setErrors(mapped);
        }
        if (err.status === 409 || err.status === 400) {
          if (/điện thoại/i.test(err.message)) return setErrors({ phone: err.message });
          if (/email/i.test(err.message)) return setErrors({ email: err.message });
        }
        return setServerMsg(err.message);
      }
      setServerMsg("Không kết nối được máy chủ. Kiểm tra backend đã chạy ở cổng 8080 chưa.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <main className="rg-page">
        <section className="rg-done">
          <div className="rg-check" aria-hidden="true">✓</div>
          <h1>Chào mừng, {done.fullName}</h1>
          <p>Tài khoản thành viên của bạn đã sẵn sàng. Mã thành viên: <strong>{done.id}</strong></p>
          <dl>
            <div><dt>Hạng hiện tại</dt><dd>Tiêu chuẩn</dd></div>
            <div><dt>Điểm tích lũy</dt><dd>{done.loyalty_points}</dd></div>
          </dl>
          <button className="rg-btn" onClick={() => { setDone(null); setForm(EMPTY); }}>
            Đăng ký tài khoản khác
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="rg-page">
      <aside className="rg-brand">
        <div className="rg-logo">OmniResto</div>
        <h2>Ăn ở chi nhánh nào cũng được tích điểm.</h2>
        <p>Một tài khoản dùng cho toàn bộ chuỗi. Điểm của bạn được cộng sau mỗi bữa ăn.</p>
        <ol className="rg-tiers">
          {TIERS.map((t, i) => (
            <li key={t.name} className={i === 0 ? "is-start" : ""}>
              <span className="rg-dot" />
              <span><strong>{t.name}</strong><small>{t.note}</small></span>
            </li>
          ))}
        </ol>
      </aside>

      <section className="rg-formwrap">
        <form className="rg-card" onSubmit={submit} noValidate>
          <h1>Đăng ký thành viên</h1>
          <p className="rg-sub">Chỉ mất một phút. Bạn có thể bỏ trống ngày sinh.</p>

          {serverMsg && <div className="rg-alert" role="alert">{serverMsg}</div>}

          <Field label="Họ và tên" name="fullName" error={errors.fullName}>
            <input id="fullName" name="fullName" value={form.fullName} onChange={set}
              autoComplete="name" placeholder="Nguyễn Văn A" aria-describedby="fullName-err" />
          </Field>

          <div className="rg-row">
            <Field label="Email" name="email" error={errors.email}>
              <input id="email" name="email" type="email" value={form.email} onChange={set}
                autoComplete="email" placeholder="ban@example.com" />
            </Field>
            <Field label="Số điện thoại" name="phone" error={errors.phone}>
              <input id="phone" name="phone" type="tel" value={form.phone} onChange={set}
                autoComplete="tel" placeholder="0912345678" />
            </Field>
          </div>

          <Field label="Ngày sinh (Bắt buộc) *" name="dateOfBirth" error={errors.dateOfBirth}>
            <input id="dateOfBirth" name="dateOfBirth" type="date" required value={form.dateOfBirth} onChange={set} />
          </Field>

          <div className="rg-row">
            <Field label="Mật khẩu" name="password" error={errors.password}>
              <div className="rg-pw">
                <input id="password" name="password" type={showPw ? "text" : "password"}
                  value={form.password} onChange={set} autoComplete="new-password" placeholder="Ít nhất 8 ký tự" />
                <button type="button" onClick={() => setShowPw(!showPw)} aria-pressed={showPw}>
                  {showPw ? "Ẩn" : "Hiện"}
                </button>
              </div>
            </Field>
            <Field label="Nhập lại mật khẩu" name="confirmPassword" error={errors.confirmPassword}>
              <input id="confirmPassword" name="confirmPassword" type={showPw ? "text" : "password"}
                value={form.confirmPassword} onChange={set} autoComplete="new-password" />
            </Field>
          </div>
          <p className="rg-hint">Mật khẩu cần có cả chữ và số.</p>

          <button className="rg-btn" disabled={loading}>
            {loading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
          </button>
        </form>
      </section>
    </main>
  );
}