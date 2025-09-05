

// src/panel/panel.jsx
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Navbar } from "../navbar/navbar";
import UploadInvoice from "./uploadInvoice";
import InvoicesTable from "./InvoicesTable";
import { MdAdminPanelSettings } from "react-icons/md";
import { formatCuit } from "../utils";

export default function Panel() {
  const authUser = useSelector((s) => s.users.authUser);
  const isAdmin = !!authUser?.is_administrator;

  const [activeTab, setActiveTab] = useState(isAdmin ? "proveedores" : "perfil");

  // CUIT proveedor (store o localStorage)
  let cuitFromStorage = "";
  try {
    const lsUser = JSON.parse(localStorage.getItem("user") || "null");
    cuitFromStorage = lsUser?.cuit_or_cuil || "";
  } catch {}
  const rawCuit = authUser?.cuit_or_cuil ?? cuitFromStorage ?? "";
  const proveedorCUIT = rawCuit ? formatCuit(rawCuit) : "—";

  const handleCargarFactura = () => {
    console.log("Cargar factura para", proveedorCUIT);
  };

  return (
    <div className="page">
      <Navbar
        isAdmin={isAdmin}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        title="Gestor de facturación GDN"
      />

      <main className="container-xl">
        <section className="band-red">
          <div className="panel-row">
            {/* Título + badge admin */}
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-semibold">
                Proveedor: {proveedorCUIT}
              </h2>

              {isAdmin && (
                <>
                  {/* MOBILE: solo ícono (el wrapper oculta todo en desktop) */}
                  <span className="md:hidden">
                    <span
                      className="status-badge status-badge--admin"
                      title="Administrador"
                      aria-label="Administrador"
                    >
                      <MdAdminPanelSettings />
                    </span>
                  </span>

                  {/* DESKTOP: solo texto (el wrapper lo oculta en mobile) */}
                  <span className="hidden md:inline">
                    <span className="status-badge status-badge--admin">
                      Administrador
                    </span>
                  </span>
                </>
              )}
            </div>

            <UploadInvoice onClick={handleCargarFactura}>
              + Cargar Factura
            </UploadInvoice>
          </div>
        </section>

        {/* Tabla de facturas */}
        <section className="mt-5">
          <InvoicesTable isAdmin={isAdmin} />
        </section>
      </main>
    </div>
  );
}
