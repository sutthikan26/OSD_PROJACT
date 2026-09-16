import type { FormEvent } from "react";
import logo from "../../Img/logo03.png";
import "./LoginPage.css";

interface LoginPageProps {
  onLogin: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  loading: boolean;
  message: string;
  language: "th" | "en";
}

function LoginPage({ onLogin, loading, message, language }: LoginPageProps) {
  const th = language === "th";

  return (
    <div className="login-page">
      <div className="login-backdrop-pattern" aria-hidden="true" />
      <div className="login-panel">
        <div className="login-brand-block">
          <img src={logo} alt="Sentinel NOC" className="login-brand-logo" />
        </div>
        <p className="login-welcome-text">
          {th
            ? "ยินดีต้อนรับสู่ Sentinel NOC Intelligence Monitoring"
            : "Welcome to Sentinel NOC Intelligence Monitoring"}
        </p>

        <form
          onSubmit={(event) => void onLogin(event)}
          className="form-grid login-form"
        >
          <label>
            {th ? "ชื่อผู้ใช้" : "Username"}
            <input
              name="username"
              required
              autoComplete="username"
              placeholder={th ? "เช่น admin หรือ super" : "e.g. admin or super"}
            />
          </label>
          <label>
            {th ? "รหัสผ่าน" : "Password"}
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder={
                th ? "เช่น admin123 หรือ super123" : "e.g. admin123 or super123"
              }
            />
          </label>
          <button type="submit" disabled={loading} className="login-submit">
            {loading
              ? th
                ? "กำลังเข้าสู่ระบบ..."
                : "Signing in..."
              : th
                ? "เข้าสู่ระบบ"
                : "Sign in"}
          </button>
        </form>

        {message && <p className="error-text">{message}</p>}

        <p className="login-footnote">
          {th ? "ศูนย์ปฏิบัติการเครือข่าย" : "Network Operations Center"}
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
