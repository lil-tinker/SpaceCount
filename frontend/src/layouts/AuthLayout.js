import { Outlet } from "react-router-dom";
import { Navigate } from "react-router-dom";
export const AuthLayout = () => {
  const token = localStorage.getItem("token");
  if (!!token) return <Navigate to="/" replace />;
  return (
    <div className="container">
      <Outlet />
    </div>
  );
}