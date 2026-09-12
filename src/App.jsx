import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import MemberDashboard from './pages/MemberDashboard';
import AddMember from './pages/AddMember';
import ViewMembers from './pages/ViewMembers';
import EditMember from './pages/EditMember';
import RenewMember from './pages/RenewMember';
import MemberDetail from './pages/MemberDetail';
import Payments from './pages/Payments';
import Workouts from './pages/Workouts';

function AppRoutes() {
  const { loading, user, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/add-member"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AddMember />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/members"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ViewMembers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/edit-member/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EditMember />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/renew-member/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <RenewMember />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/members/:id"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <MemberDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Payments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workouts"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Workouts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/member/dashboard"
        element={
          <ProtectedRoute allowedRoles={['member']}>
            <MemberDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          user ? (
            role === 'admin'
              ? <Navigate to="/admin/dashboard" replace />
              : <Navigate to="/member/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="*"
        element={
          user ? (
            role === 'admin'
              ? <Navigate to="/admin/dashboard" replace />
              : <Navigate to="/member/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;