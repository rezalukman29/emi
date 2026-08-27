// TypeScript page component.
import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { toast } from "react-toastify";
import { IconMail, IconLock } from "../../components/icons";
import usePostAdminLogin from "../../hooks/api/usePostAdminLogin";
import {
  isSuperAdminAuthed,
  markSuperAdminAuthed,
} from "../../lib/superAdminAuth";
import { useDispatch } from "react-redux";
import { setProfile } from "../../store/profile";

function loginErrorMessage(error: unknown) {
  const apiMessage = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;
  if (apiMessage) return apiMessage;
  return error instanceof Error ? error.message : "Failed to sign in.";
}

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { mutateAsync: postAdminLogin, isLoading } = usePostAdminLogin();
  const dispatch = useDispatch();
  if (isSuperAdminAuthed()) {
    return <Navigate to="/superadmin/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password) {
      const message = "Please enter both email and password.";
      setError(message);
      toast(message, { type: "error" });
      return;
    }
    setError("");
    try {
      const response = await postAdminLogin({
        email: email.trim(),
        password,
      });
      const data = {
        email: response.data.email,
        id: response.data.id,
        fullname: response.data.fullname,
        token: response.data.token,
        user_type: "SUPERADMIN",
      };
      dispatch(setProfile(data));
      localStorage.setItem("auth", JSON.stringify(data));
      markSuperAdminAuthed();
      const destination =
        location.state?.from?.pathname || "/superadmin/dashboard";
      navigate(destination, { replace: true });
    } catch (submitError) {
      const message = loginErrorMessage(submitError);
      setError(message);
      toast(message, { type: "error" });
    }
  }

  return (
    <div className="sa-theme sa-login-page">
      <div className="sa-login-card">
        <div className="sa-login-brand">
          <div className="sa-login-logo">EMI</div>
          <div>
            <div className="sa-login-title">SaaS Owner Panel</div>
            <div className="sa-login-sub">
              Manage customers, payments &amp; pricing
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <div className="sa-input-wrap">
              <IconMail />
              <input
                type="email"
                placeholder="owner@yourcompany.com"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="sa-input-wrap">
              <IconLock />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="sa-login-error">{error}</div>}

          <button
            type="submit"
            className="btn-primary btn sa-login-submit"
            disabled={isLoading}
          >
            {isLoading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
