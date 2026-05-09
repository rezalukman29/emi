import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { IconMenu, IconLogout } from "./icons";
import { localStorageService } from "../service/localStorage";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setProfile } from "../store/profile";

export default function Layout() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const checkAuth = () => {
    const auth = localStorageService.getAuth("auth");
    if (auth) {
      const data = JSON.parse(auth);
      dispatch(
        setProfile({
          id: data?.id,
          fullname: data?.fullname,
          email: data?.email,
          user_type: data?.user_type,
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
    checkAuth();
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
        <button className="header-btn" title="Logout" onClick={onSignOut}>
          <IconLogout />
        </button>
      </header>
      <div className="layout">
        <Sidebar visible={sidebarVisible} />
        <main className="main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
