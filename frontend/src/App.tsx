import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/Chrome';
import { useTableSession } from './context/TableContext';
import { DemoChrome } from './demo-tour/DemoChrome';
import { isSalesDemoAdminPath } from './demo-tour/eligibility';
import { useDemoTour } from './demo-tour/context';
import { HomePage } from './pages/HomePage';
import { MenuItemPage, MenuPage } from './pages/MenuPage';
import { CartPage, OrderPage } from './pages/OrderPage';
import {
  OrderDetailsPage,
  OrdersPage,
  ProfilePage,
  ReservationDetailsPage,
  ReservationsPage,
} from './pages/ProfilePage';
import { ReservePage } from './pages/ReservePage';
import { TablePage } from './pages/TablePage';
import {
  AdminGuestPage,
  AdminGuestsPage,
  AdminLoyaltyPage,
  AdminMenuPage,
  AdminOrdersPage,
  AdminPage,
  AdminReservationsPage,
  AdminTablesPage,
  AdminWaitlistPage,
} from './pages/AdminPage';

export default function App() {
  const location = useLocation();
  const isAdmin = isSalesDemoAdminPath(location.pathname);
  const tour = useDemoTour();
  const table = useTableSession();

  if (table.code && location.pathname === '/') {
    return <Navigate to={`/table?table=${table.code}`} replace />;
  }

  return (
    <div className={isAdmin ? undefined : 'app-shell'}>
      {tour.showChrome && (
        <DemoChrome
          showTour={tour.demoTourEnabled}
          showAdmin={tour.demoAdminPreviewEnabled}
          onStartTour={tour.start}
        />
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/reserve" element={<ReservePage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/menu/:id" element={<MenuItemPage />} />
        <Route path="/order" element={<OrderPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/reservations/:id" element={<ReservationDetailsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailsPage />} />
        <Route path="/table" element={<TablePage />} />
        <Route path="/demo/admin" element={<AdminPage readOnly />} />
        <Route path="/demo/admin/reservations" element={<AdminReservationsPage readOnly />} />
        <Route path="/demo/admin/tables" element={<AdminTablesPage readOnly />} />
        <Route path="/demo/admin/waitlist" element={<AdminWaitlistPage readOnly />} />
        <Route path="/demo/admin/orders" element={<AdminOrdersPage readOnly />} />
        <Route path="/demo/admin/menu" element={<AdminMenuPage readOnly />} />
        <Route path="/demo/admin/guests" element={<AdminGuestsPage readOnly />} />
        <Route path="/demo/admin/guests/:id" element={<AdminGuestPage readOnly />} />
        <Route path="/demo/admin/loyalty" element={<AdminLoyaltyPage readOnly />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/reservations" element={<AdminReservationsPage />} />
        <Route path="/admin/tables" element={<AdminTablesPage />} />
        <Route path="/admin/waitlist" element={<AdminWaitlistPage />} />
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/admin/menu" element={<AdminMenuPage />} />
        <Route path="/admin/guests" element={<AdminGuestsPage />} />
        <Route path="/admin/guests/:id" element={<AdminGuestPage />} />
        <Route path="/admin/loyalty" element={<AdminLoyaltyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!isAdmin && <BottomNav />}
    </div>
  );
}
