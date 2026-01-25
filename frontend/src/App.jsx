import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ResetPassword from './pages/ResetPassword';
import ForceResetPassword from './pages/ForceResetPassword';

function PrivateRoute({ children, allowedRoles, skipForceReset = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Skip force reset check for the force-reset page itself
  if (!skipForceReset && user.forcePasswordReset) {
    return <Navigate to="/force-reset" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      
      <Route path="/force-reset" element={
        user ? (
          user.forcePasswordReset ? (
            <ForceResetPassword />
          ) : (
            <Navigate to="/" replace />
          )
        ) : (
          <Navigate to="/login" replace />
        )
      } />

      <Route path="/" element={
        <PrivateRoute>
          {user?.role === 'user' ? <UserDashboard /> : <Navigate to="/admin" replace />}
        </PrivateRoute>
      } />

      <Route path="/admin/*" element={
        <PrivateRoute allowedRoles={['admin', 'ceo']}>
          <AdminDashboard />
        </PrivateRoute>
      } />

      <Route path="/reset-password" element={
        <PrivateRoute>
          <ResetPassword />
        </PrivateRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
