import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthLayout } from "./layouts/AuthLayout";
import { MainLayout } from "./layouts/MainLayout";
import { Authorization } from "./pages/Authorization";
import { Registration } from "./pages/Registration";
import { Cameras } from "./pages/Cameras";
import { Widgets } from "./pages/Widgets";
import { CameraForm } from "./pages/CameraForm";
import { WidgetForm } from "./pages/WidgetForm";
import { WidgetIfream } from "./pages/WidgetIfream";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Authorization />} />
          <Route path="/registration" element={<Registration />} />
        </Route>
        <Route path="/widget/:token" element={<WidgetIfream />} />
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/widgets" replace />} />
          <Route path="/cameras" element={<Cameras />} />
          <Route path="/cameras/add" element={<CameraForm key="add" />} />
          <Route path="/cameras/:id/edit/" element={<CameraForm key="edit" />} />
          <Route path="/widgets" element={<Widgets/>} />
          <Route path="/widgets/add" element={<WidgetForm/>} />
        </Route>
        <Route path="*" element={
          localStorage.getItem("token")
            ? <Navigate to="/" replace />
            : <Navigate to="/login" replace />
          } />
      </Routes>
    </BrowserRouter>
  );
}