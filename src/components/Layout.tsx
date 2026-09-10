import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar, {
  getFirstAccessibleRoute,
  getRequiredFeatureForPath,
} from "./Sidebar";
import { IconMenu, IconLogout } from "./icons";
import { localStorageService } from "../service/localStorage";
import { useDispatch } from "react-redux";
import { useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import ChatBot from "./ChatBot";
import { setProfile } from "../store/profile";
import {
  clearUserPlan,
  setUserPlan,
  setUserPlanError,
  setUserPlanLoading,
} from "../store/userPlanSlice";
import useGetUserPlan from "../hooks/api/useGetUserPlan";
import GlobalSearch from "./GlobalSearch";
import LanguageSwitcher from "./LanguageSwitcher";
import UpgradeCTA from "./UpgradeCTA";
import useUserPlanController from "../hooks/useUserPlanController";
import { useTranslation } from "react-i18next";

type StoredAuth = {
  id?: number;
  fullname?: string;
  email?: string;
  user_type?: string;
};

export default function Layout() {
  const { t } = useTranslation();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [currentUser, setCurrentUser] = useState<StoredAuth | null>(null);
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const enabledFeatures = useUserPlanController();
  const shouldGetUserPlan = Boolean(
    currentUser?.user_type &&
      currentUser.user_type.toUpperCase() !== "SUPERADMIN",
  );
  const {
    data: userPlanResponse,
    error: userPlanError,
    isError: isUserPlanError,
    isFetching: isUserPlanFetching,
  } = useGetUserPlan({
    userId: currentUser?.id,
    options: { enabled: shouldGetUserPlan },
  });
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

  useEffect(() => {
    if (!shouldGetUserPlan) {
      dispatch(clearUserPlan());
      return;
    }
    dispatch(setUserPlanLoading(isUserPlanFetching));
  }, [dispatch, isUserPlanFetching, shouldGetUserPlan]);

  useEffect(() => {
    if (!shouldGetUserPlan || !userPlanResponse?.data) return;
    dispatch(setUserPlan(userPlanResponse.data));
  }, [dispatch, shouldGetUserPlan, userPlanResponse]);

  useEffect(() => {
    if (!shouldGetUserPlan || !isUserPlanError) return;
    const message =
      (userPlanError as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ??
      (userPlanError instanceof Error
        ? userPlanError.message
        : "Failed to get user plan.");
    dispatch(setUserPlanError(message));
  }, [dispatch, isUserPlanError, shouldGetUserPlan, userPlanError]);

  useEffect(() => {
    if (!shouldGetUserPlan || !userPlanResponse?.data) return;

    const requiredFeature = getRequiredFeatureForPath(location.pathname);
    if (!requiredFeature || enabledFeatures[requiredFeature]) return;

    navigate(getFirstAccessibleRoute(enabledFeatures), { replace: true });
  }, [
    enabledFeatures,
    location.pathname,
    navigate,
    shouldGetUserPlan,
    userPlanResponse?.data,
  ]);

  const onSignOut = () => {
    localStorageService.clearAuth("auth");
    queryClient.removeQueries(["useGetUserPlan"]);
    dispatch(clearUserPlan());
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
            title={t("header.toggleMenu")}
          >
            <IconMenu />
          </button>
          <span className="header-title">{t("header.appName")}</span>
        </div>
        <GlobalSearch />
        <div className="header-actions">
          <UpgradeCTA />
          {currentUser && (
            <span className="header-user">
              {currentUser.fullname || currentUser.email || t("common.user")}
              <span> · {currentUser.user_type || t("common.employee")}</span>
            </span>
          )}
          <LanguageSwitcher />
          <button className="header-btn" title={t("header.logout")} onClick={onSignOut}>
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
