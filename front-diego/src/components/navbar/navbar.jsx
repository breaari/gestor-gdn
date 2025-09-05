// src/components/panel/Navbar.jsx
import React, { Fragment, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Dialog, Transition } from "@headlessui/react";
import { logout } from "../../redux/users.slice";

export function Navbar({ title = "GDN - Gestor de facturación" }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const authUser = useSelector((s) => s.users.authUser);
  const uid = authUser?.id;
  const isAdmin = !!authUser?.is_administrator;

  const [menuOpen, setMenuOpen] = useState(false);
  const closeBtnRef = useRef(null);

  const makePath = (key) => {
    if (!uid) return "/login";
    if (key === "proveedores") return `/manager/${uid}/suppliers`;
    if (key === "localidades") return `/manager/${uid}/localities`;
    if (key === "categorias") return `/manager/${uid}/categories`;
    if (key === "facturas") return `/manager/${uid}/invoices`;
    if (key === "perfil") return `/manager/${uid}/profile`;
    return `/manager/${uid}/invoices`;
  };

  const tabs = isAdmin
    ? [
        { key: "facturas", label: "Facturas", path: makePath("facturas") },
        { key: "proveedores", label: "Proveedores", path: makePath("proveedores") },
        { key: "categorias", label: "Categorías", path: makePath("categorias") },
        { key: "localidades", label: "Localidades", path: makePath("localidades") },
        { key: "perfil", label: "Mi perfil", path: makePath("perfil") },
      ]
    : [
        { key: "facturas", label: "Mis facturas", path: makePath("facturas") },
        { key: "perfil", label: "Ver mi perfil", path: makePath("perfil") },
      ];

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const goHome = () => {
    if (!uid) return navigate("/login", { replace: true });
    navigate(`/manager/${uid}/invoices`);
  };

  const currentKey =
    /\/suppliers\b/.test(pathname) ? "proveedores" :
    /\/categories\b/.test(pathname) ? "categorias" :
    /\/localities\b/.test(pathname) ? "localidades" :
    /\/profile\b/.test(pathname) ? "perfil" :
    /\/invoices\b|\/panel\b/.test(pathname) ? "facturas" :
    "facturas";

  const initial = (
    authUser?.fantasy_name?.[0] ||
    authUser?.company_name?.[0] ||
    authUser?.email?.[0] ||
    "U"
  ).toUpperCase();

  const displayFantasy =
    authUser?.fantasy_name || authUser?.company_name || "Mi cuenta";

  return (
    <nav className="w-full bg-slate-800 text-white">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between gap-3">
        {/* Título: GDN en mobile, completo en desktop */}
        <button type="button" onClick={goHome} className="text-lg font-semibold hover:opacity-90">
          <span className="md:hidden">GDN - Gestor de facturación</span>
          <span className="hidden md:inline">{title}</span>
        </button>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-2">
          {tabs.map((t) => (
            <NavLink
              key={t.key}
              to={t.path}
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm/6 ${isActive ? "bg-white/10 text-white" : "text-white/80 hover:text-white hover:bg-white/10"}`
              }
            >
              {t.label}
            </NavLink>
          ))}
          <div className="pl-3 ml-2 border-l border-white/20 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 grid place-items-center font-bold" title={displayFantasy}>
              {initial}
            </div>
            <button onClick={handleLogout} className="text-sm text-white/80 hover:text-white underline underline-offset-4">
              Cerrar sesión
            </button>
          </div>
        </div>

        {/* Mobile: botón menú (hamburger) + avatar. SIN botón Salir suelto */}
        <div className="md:hidden flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-800 grid place-items-center font-bold" title={displayFantasy}>
            {initial}
          </div>
          <button
            className="p-2 rounded-md bg-white/10 hover:bg-white/20 active:bg-white/25"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            {/* ícono hamburger (svg inline) */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ===== Mobile Drawer ===== */}
      <Transition show={menuOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" initialFocus={closeBtnRef} onClose={setMenuOpen}>
          {/* Fondo oscuro */}
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          {/* Panel deslizable desde la derecha */}
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-out duration-250"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="w-screen max-w-sm bg-white text-slate-900 shadow-xl">
                  {/* Header del drawer */}
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 text-white grid place-items-center font-bold">{initial}</div>
                      <div className="flex flex-col">
                        <Dialog.Title className="text-base font-semibold leading-6">
                          {displayFantasy}
                        </Dialog.Title>
                        <span className="text-xs text-slate-500">Cuenta</span>
                      </div>
                    </div>
                    <button
                      ref={closeBtnRef}
                      onClick={() => setMenuOpen(false)}
                      className="p-2 rounded-md hover:bg-slate-100"
                      aria-label="Cerrar menú"
                    >
                      {/* ícono X */}
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>

                  {/* Opciones */}
                  <div className="px-2 py-2">
                    <nav className="flex flex-col">
                      {tabs.map((t) => {
                        const active = currentKey === t.key;
                        return (
                          <button
                            key={t.key}
                            onClick={() => {
                              navigate(t.path);
                              setMenuOpen(false);
                            }}
                            className={`w-full text-left px-3 py-3 rounded-lg mb-1 text-sm font-medium
                              ${active ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}
                          >
                            {t.label}
                          </button>
                        );
                      })}

                      {/* Divider */}
                      <div className="my-2 border-t" />

                      {/* Salir dentro del mismo despliegue */}
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-3 py-3 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700"
                      >
                        Salir
                      </button>
                    </nav>
                  </div>

                  {/* Footer opcional */}
                  <div className="px-4 py-3 text-xs text-slate-400 border-t">
                    GDN — Gestor de facturación
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </nav>
  );
}
