import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { IconMenu, IconLogout } from "./icons";
import { localStorageService } from "../service/localStorage";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import ChatBot from "./ChatBot";
import { setProfile } from "../store/profile";
import GlobalSearch from "./GlobalSearch";
import LanguageSwitcher from "./LanguageSwitcher";

type StoredAuth = {
  id?: number;
  fullname?: string;
  email?: string;
  user_type?: string;
};

export default function Layout() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [currentUser, setCurrentUser] = useState<StoredAuth | null>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const checkAuth = () => {
    const auth = localStorageService.getAuth("auth");
    if (auth) {
      const data = JSON.parse(auth) as StoredAuth;
      setCurrentUser(data);
      dispatch(
        setProfile({
          id: data?.id ?? 0,
          fullname: data?.fullname ?? "",
          email: data?.email ?? "",
          user_type: data?.user_type ?? "",
        })
      );
      return;
    } else {
      navigate("/login");
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const onSignOut = () => {
    localStorageService.clearAuth("auth");
    setCurrentUser(null);
    navigate("/login", { replace: true });
  };
  return (
    <>
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            className="header-btn"
            onClick={() => setSidebarVisible((v) => !v)}
            title="Toggle menu"
          >
            <IconMenu />
          </button>
          <span className="header-title">EMI Inventory</span>
        </div>
        <GlobalSearch />
        <div className="header-actions">
          {currentUser && (
            <span className="header-user">
              {currentUser.fullname || currentUser.email || "User"}
              <span> · {currentUser.user_type || "Employee"}</span>
            </span>
          )}
          <LanguageSwitcher />
          <button className="header-btn" title="Logout" onClick={onSignOut}>
            <IconLogout />
          </button>
        </div>
      </header>
      <div className="layout">
        <Sidebar visible={sidebarVisible} />
        <main className="main">
          <Outlet />
        </main>
      </div>
      <ChatBot />
    </>
  );
}
