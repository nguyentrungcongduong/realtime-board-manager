import { Outlet } from 'react-router-dom';

function AuthLayout() {
  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden flex flex-col justify-between">
      <Outlet />
    </div>
  );
}

export default AuthLayout;
