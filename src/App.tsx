import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { QueryClient, QueryClientProvider } from "react-query";
import { ToastContainer } from "react-toastify";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth.jsx";
import RequireTenantAuth from "./components/RequireTenantAuth";
import AreaDetailPage from "./pages/AreaDetailPage.jsx";
import AreaPage from "./pages/AreaPage.jsx";
import AiMaterialAnalyzerPage from "./pages/AiMaterialAnalyzerPage";
import CategoryDetailPage from "./pages/CategoryDetailPage.jsx";
import CategoryPage from "./pages/CategoryPage";
import MainDashboardPage from "./pages/DashboardPage";
import EventDetailPage from "./pages/EventDetailPage";
import EventInventoryPage from "./pages/EventInventoryPage";
import EventPage from "./pages/EventPage";
import EventStatusPage from "./pages/EventStatusPage";
import EventSummaryPage from "./pages/EventSummaryPage";
import InventoryDetailPage from "./pages/InventoryDetailPage";
import InventoryPage from "./pages/InventoryPage";
import InventoryReportPage from "./pages/InventoryReportPage";
import ItemLoanPage from "./pages/ItemLoanPage";
import LogPage from "./pages/LogPage";
import LoginPage from "./pages/Login";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import OverviewReportPage from "./pages/OverviewReportPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import PRDPage from "./pages/PRDPage";
import RegisterPage from "./pages/RegisterPage";
import StockOpnamePage from "./pages/StockOpnamePage";
import SubAreaPage from "./pages/SubAreaPage";
import SyncInventoryPage from "./pages/SyncInventoryPage";
import UnitDetailPage from "./pages/UnitDetailPage.jsx";
import UnitPage from "./pages/UnitPage";
import UsersPage from "./pages/UsersPage";
import WarehouseDetailPage from "./pages/WarehouseDetailPage";
import WarehouseInventoryPage from "./pages/WarehouseInventoryPage";
import WarehousePage from "./pages/WarehousePage";
import CustomersPage from "./pages/superadmin/CustomersPage";
import DashboardPage from "./pages/superadmin/DashboardPage";
import DefaultCategoriesPage from "./pages/superadmin/DefaultCategoriesPage";
import DefaultUnitsPage from "./pages/superadmin/DefaultUnitsPage";
import PaymentsPage from "./pages/superadmin/PaymentsPage";
import PricingPage from "./pages/superadmin/PricingPage";
import SuperAdminLayout from "./pages/superadmin/SuperAdminLayout";
import SuperAdminLogin from "./pages/superadmin/SuperAdminLogin";
import SuperAdminUsersPage from "./pages/superadmin/SuperAdminUsersPage";
import { store } from "./store/store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 50,
    },
  },
});

export default function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route
              path="/superadmin"
              element={
                <RequireAuth>
                  <SuperAdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="users" element={<SuperAdminUsersPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="pricing" element={<PricingPage />} />
              <Route path="categories" element={<DefaultCategoriesPage />} />
              <Route path="units" element={<DefaultUnitsPage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>

            <Route
              path="/"
              element={
                <RequireTenantAuth>
                  <Layout />
                </RequireTenantAuth>
              }
            >
              <Route index element={<Navigate to="/event" replace />} />
              <Route path="dashboard" element={<MainDashboardPage />} />
              <Route path="prd" element={<PRDPage />} />
              <Route path="stock-opname" element={<StockOpnamePage />} />
              <Route path="inventory-report" element={<InventoryReportPage />} />
              <Route path="overview-report" element={<OverviewReportPage />} />
              <Route path="event" element={<EventPage />} />
              <Route path="event-detail" element={<EventDetailPage />} />
              <Route path="event-detail/:id" element={<EventDetailPage />} />
              <Route path="event-summary" element={<EventSummaryPage />} />
              <Route path="warehouse" element={<WarehousePage />} />
              <Route path="warehouse-detail" element={<WarehouseDetailPage />} />
              <Route path="warehouse-inventory" element={<WarehouseInventoryPage />} />
              <Route path="event-inventory" element={<EventInventoryPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="inventory/:id" element={<InventoryDetailPage />} />
              <Route path="inventory-detail" element={<InventoryDetailPage />} />
              <Route path="sync-inventory" element={<SyncInventoryPage />} />
              <Route path="item-loan" element={<ItemLoanPage />} />
              <Route path="area" element={<AreaPage />} />
              <Route path="area-detail" element={<AreaDetailPage />} />
              <Route path="sub-area" element={<SubAreaPage />} />
              <Route path="event-status" element={<EventStatusPage />} />
              <Route path="category" element={<CategoryPage />} />
              <Route path="category-detail" element={<CategoryDetailPage />} />
              <Route path="unit" element={<UnitPage />} />
              <Route path="unit-detail" element={<UnitDetailPage />} />
              <Route path="qr-code" element={<PlaceholderPage title="QR Code" />} />
              <Route path="ai-material-analyzer" element={<AiMaterialAnalyzerPage />} />
              <Route path="log" element={<LogPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="*" element={<Navigate to="/event" replace />} />
            </Route>
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}
