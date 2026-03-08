// src/components/panel/Suppliers.jsx
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Navbar } from "../navbar/navbar";
import SuppliersTable from "./suppliersTable";   // ✅ ruta/casing correctos
import AddSupplier from "./addSuppliers";         // ✅ ruta/casing correctos

export default function Suppliers() {
  const authUser = useSelector((s) => s.users.authUser);
  const isAdmin = !!authUser?.is_administrator;

  // Para que la Navbar lo resalte de entrada
  const [activeTab, setActiveTab] = useState("proveedores");

  return (
    <div className="page">
      <Navbar
        isAdmin={isAdmin}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        title="Gestor de facturación GDN"
      />

      <main className="container-xl">
        {/* Banda superior como en Panel */}
        <section className="band-red">
          <div className="panel-row">
            <h2 className="text-xl md:text-2xl font-semibold">Proveedores</h2>

            {/* Botón alineado a la derecha dentro de panel-row */}
            <AddSupplier onCreated={() => { /* opcional: toast o refrescar */ }}>
              + Nuevo proveedor
            </AddSupplier>
          </div>
        </section>

        {/* Tabla de proveedores */}
        <section className="mt-5">
          <SuppliersTable />
        </section>
      </main>
    </div>
  );
}
