import { Outlet } from 'react-router-dom';

function AuthLayout() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Background blobs */}
      <div className="blob w-96 h-96 bg-indigo-300 -top-20 -left-20" />
      <div className="blob w-80 h-80 bg-violet-300 -bottom-10 -right-10" />

      <div className="relative z-10 w-full max-w-md px-4">
        <Outlet />
      </div>
    </div>
  );
}

export default AuthLayout;
