import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import AuthLayout from '@/layouts/AuthLayout';
import AppLayout from '@/layouts/AppLayout';
import LoginPage from '@/pages/LoginPage';
import BoardsPage from '@/pages/BoardsPage';
import BoardDetailPage from '@/pages/BoardDetailPage';
import GitHubConnectedPage from '@/pages/GitHubConnectedPage';

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      {/* Public routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected routes */}
      <Route
        element={
          isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />
        }
      >
        <Route path="/" element={<Navigate to="/boards" replace />} />
        <Route path="/boards" element={<BoardsPage />} />
        <Route path="/boards/:boardId" element={<BoardDetailPage />} />
        <Route path="/github/connected" element={<GitHubConnectedPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
