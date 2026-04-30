import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import EventPage from './pages/EventPage';
import EventDetailPage from './pages/EventDetailPage';
import EventSummaryPage from './pages/EventSummaryPage';
import WarehousePage from './pages/WarehousePage';
import WarehouseInventoryPage from './pages/WarehouseInventoryPage';
import EventInventoryPage from './pages/EventInventoryPage';
import InventoryPage from './pages/InventoryPage';
import SyncInventoryPage from './pages/SyncInventoryPage';
import AreaPage from './pages/AreaPage';
import SubAreaPage from './pages/SubAreaPage';
import EventStatusPage from './pages/EventStatusPage';
import CategoryPage from './pages/CategoryPage';
import UnitPage from './pages/UnitPage';
import PlaceholderPage from './pages/PlaceholderPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/event" replace />} />
          <Route path="event" element={<EventPage />} />
          <Route path="event-detail" element={<EventDetailPage />} />
          <Route path="event-summary" element={<EventSummaryPage />} />
          <Route path="warehouse" element={<WarehousePage />} />
          <Route path="warehouse-inventory" element={<WarehouseInventoryPage />} />
          <Route path="event-inventory" element={<EventInventoryPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="sync-inventory" element={<SyncInventoryPage />} />
          <Route path="area" element={<AreaPage />} />
          <Route path="sub-area" element={<SubAreaPage />} />
          <Route path="event-status" element={<EventStatusPage />} />
          <Route path="category" element={<CategoryPage />} />
          <Route path="unit" element={<UnitPage />} />
          <Route path="qr-code" element={<PlaceholderPage title="QR Code" />} />
          <Route path="log" element={<PlaceholderPage title="Log" />} />
          <Route path="users" element={<PlaceholderPage title="Users" />} />
          <Route path="*" element={<Navigate to="/event" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
