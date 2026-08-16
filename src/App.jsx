import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import EventPage from "./pages/EventPage";
import EventDetailPage from "./pages/EventDetailPage";
import EventSummaryPage from "./pages/EventSummaryPage";
import WarehousePage from "./pages/WarehousePage";
import WarehouseDetailPage from "./pages/WarehouseDetailPage";
import WarehouseInventoryPage from "./pages/WarehouseInventoryPage";
import EventInventoryPage from "./pages/EventInventoryPage";
import InventoryPage from "./pages/InventoryPage";
import InventoryDetailPage from "./pages/InventoryDetailPage";
import SyncInventoryPage from "./pages/SyncInventoryPage";
import AreaPage from "./pages/AreaPage";
import AreaDetailPage from "./pages/AreaDetailPage";
import SubAreaPage from "./pages/SubAreaPage";
import EventStatusPage from "./pages/EventStatusPage";
import CategoryPage from "./pages/CategoryPage";
import CategoryDetailPage from "./pages/CategoryDetailPage";
import UnitPage from "./pages/UnitPage";
import UnitDetailPage from "./pages/UnitDetailPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import AiMaterialAnalyzerPage from "./pages/AiMaterialAnalyzerPage";
import MainDashboardPage from "./pages/DashboardPage";
import InventoryReportPage from "./pages/InventoryReportPage";
import OverviewReportPage from "./pages/OverviewReportPage";
import ItemLoanPage from "./pages/ItemLoanPage";
import LogPage from "./pages/LogPage";
import UsersPage from "./pages/UsersPage";
import { ToastContainer } from "react-toastify";
import LoginPage from "./pages/Login";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { QueryClient, QueryClientProvider } from "react-query";
import RequireAuth from "./components/RequireAuth";
import SuperAdminLogin from "./pages/superadmin/SuperAdminLogin";
import SuperAdminLayout from "./pages/superadmin/SuperAdminLayout";
import DashboardPage from "./pages/superadmin/DashboardPage";
import CustomersPage from "./pages/superadmin/CustomersPage";
import PaymentsPage from "./pages/superadmin/PaymentsPage";
import PricingPage from "./pages/superadmin/PricingPage";
import DefaultCategoriesPage from "./pages/superadmin/DefaultCategoriesPage";
import DefaultUnitsPage from "./pages/superadmin/DefaultUnitsPage";

export default function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 2,
        staleTime: 50,
      },
    },
  });
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
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
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="pricing" element={<PricingPage />} />
              <Route path="categories" element={<DefaultCategoriesPage />} />
              <Route path="units" element={<DefaultUnitsPage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>
            <Route path="login" element={<LoginPage />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/login" replace />} />
              <Route path="dashboard" element={<MainDashboardPage />} />
              <Route
                path="inventory-report"
                element={<InventoryReportPage />}
              />
              <Route path="overview-report" element={<OverviewReportPage />} />
              <Route path="event" element={<EventPage />} />
              <Route path="event-detail" element={<EventDetailPage />} />
              <Route path="event-summary" element={<EventSummaryPage />} />
              <Route path="warehouse" element={<WarehousePage />} />
              <Route
                path="warehouse-detail"
                element={<WarehouseDetailPage />}
              />
              <Route
                path="warehouse-inventory"
                element={<WarehouseInventoryPage />}
              />
              <Route path="event-inventory" element={<EventInventoryPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route
                path="inventory-detail"
                element={<InventoryDetailPage />}
              />
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
              <Route
                path="qr-code"
                element={<PlaceholderPage title="QR Code" />}
              />
              <Route
                path="ai-material-analyzer"
                element={<AiMaterialAnalyzerPage />}
              />
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
