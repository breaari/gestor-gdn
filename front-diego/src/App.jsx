// src/App.jsx
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Login } from "./components/login/login";
import Register from "./components/login/register";
import Panel from "./components/panel/panel";
import Profile from "./components/panel/profile.jsx";
import UserAuthentication from "./components/UserAuthentication.jsx";
import Suppliers from "./components/suppliers/suppliers.jsx";
import Categories from "./components/categories/categories.jsx";
import Localities from "./components/localities/localities.jsx";

// Wrapper que aplica autenticación y permite anidar rutas via <Outlet />
function Protected() {
  return (
    <UserAuthentication>
      <Outlet />
    </UserAuthentication>
  );
}

export default function App() {
  return (
    <div className="h-screen">
      <Routes>
        {/* públicas */}
        {/* <Route path="/" element={<Register />} /> */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* protegidas: TODO /manager/:id/* */}
        <Route path="/manager/:id" element={<Protected />}>
          {/* /manager/:id -> /panel */}
          <Route index element={<Navigate to="invoices" replace />} />
          <Route path="invoices" element={<Panel />} />
          <Route path="profile" element={<Profile />} />
          <Route path="suppliers" element={<Suppliers />} />
          <Route path="categories" element={<Categories />} />
          <Route path="localities" element={<Localities />} />
        </Route>

        {/* opcional: catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}
