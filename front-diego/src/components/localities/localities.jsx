// src/panel/localities.jsx
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navbar } from "../navbar/navbar";
import { fetchLocalities } from "../../redux/localities.slice";
import LocalitiesTable from "./localitiesTable";
import AddLocality from "./addLocality";

const cx = (...c) => c.filter(Boolean).join(" ");

export default function Localities() {
  const dispatch = useDispatch();

  // auth (para Navbar)
  const authUser = useSelector((s) => s.users?.authUser);
  const isAdmin = !!authUser?.is_administrator;

  // estado localities (por si aún no registraste el reducer)
  const { status = "idle" } = useSelector((s) => s.localities ?? {});

  // pestaña activa (Navbar)
  const [activeTab, setActiveTab] = useState("localidades");

  // carga inicial
  useEffect(() => {
    if (status === "idle") dispatch(fetchLocalities());
  }, [status, dispatch]);

  return (
    <div className="page">
      <Navbar
        isAdmin={isAdmin}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        title="Gestor de facturación GDN"
      />

      <main className="container-xl">
        {/* Banda superior */}
        <section className="band-red">
          <div className="panel-row">
            <h2 className="text-xl md:text-2xl font-semibold">Localidades</h2>

            <AddLocality>{"+ Agregar localidad"}</AddLocality>
          </div>
        </section>

        {/* Tabla */}
        <section className="mt-4">
          <LocalitiesTable />
        </section>
      </main>
    </div>
  );
}

/* UI helpers (por si los necesitás luego) */
function Th({ children }) {
  return <th className="th">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={cx("td", className)}>{children}</td>;
}
