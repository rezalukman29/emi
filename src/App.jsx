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
import { ToastContainer } from "react-toastify";
import LoginPage from "./pages/Login";
import { Provider } from "react-redux";
import { store } from "./store/store";
import { QueryClient, QueryClientProvider } from "react-query";

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
            <Route path="login" element={<LoginPage />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/login" replace />} />
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
              <Route path="log" element={<PlaceholderPage title="Log" />} />
              <Route path="users" element={<PlaceholderPage title="Users" />} />
              <Route path="*" element={<Navigate to="/event" replace />} />
            </Route>
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}
