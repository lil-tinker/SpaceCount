import { Outlet } from "react-router-dom";
import { Menu } from '../components/Menu';
import { Navigate } from "react-router-dom";
export const MainLayout = () => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return (
    <div className="container">
      <Menu />
      <Outlet />
    </div>
  );
}