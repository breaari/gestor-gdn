// // src/components/UserAuthentication.jsx
// import React, { useEffect } from "react";
// import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
// import { useDispatch, useSelector } from "react-redux";
// import { fetchUserById } from "../redux/users.slice";

// export default function UserAuthentication({ children }) {
//   const { id: routeId } = useParams();
//   const location = useLocation();
//   const dispatch = useDispatch();

//   const authUser = useSelector((s) => s.users.authUser);
//   const isAuthenticated = !!authUser?.id;
//   const isAdmin = !!authUser?.is_administrator;
//   const urlId = Number(routeId);

//   // 👇 El hook SIEMPRE se registra; adentro lo protegemos con condiciones.
//   useEffect(() => {
//     if (!isAuthenticated) return;
//     if (isAdmin && Number.isFinite(urlId) && urlId !== Number(authUser.id)) {
//       dispatch(fetchUserById(urlId));
//     }
//   }, [dispatch, isAdmin, isAuthenticated, urlId, authUser?.id]);

//   // Redirecciones (después de los hooks)
//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace state={{ from: location }} />;
//   }

//   if (Number.isFinite(urlId) && !isAdmin && urlId !== Number(authUser.id)) {
//     return <Navigate to={`/manager/${authUser.id}/invoices`} replace />;
//   }

//   return children ?? <Outlet />;
// }


// src/components/UserAuthentication.jsx
import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserById } from "../redux/users.slice";

export default function UserAuthentication({ children }) {
  const { id: routeId } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();

  const authUser = useSelector((s) => s.users.authUser);
  const isAuthenticated = !!authUser?.id;
  const isAdmin = !!authUser?.is_administrator;
  const urlId = Number(routeId);

  // 👇 SIEMPRE registrar los hooks primero
  useEffect(() => {
    if (!isAuthenticated) return;
    // Admin viendo perfil ajeno: precargar detalle
    if (isAdmin && Number.isFinite(urlId) && urlId !== Number(authUser.id)) {
      dispatch(fetchUserById(urlId));
    }
  }, [dispatch, isAdmin, isAuthenticated, urlId, authUser?.id]);

  // 👇 Recién acá, las redirecciones
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (Number.isFinite(urlId) && !isAdmin && urlId !== Number(authUser.id)) {
    return <Navigate to={`/manager/${authUser.id}/invoices`} replace />;
  }

  return children ?? <Outlet />;
}
