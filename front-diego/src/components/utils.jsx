export const onlyDigits = (v = "") => v.replace(/\D+/g, "");

export const isValidCuit = (cuit) => {
  const x = onlyDigits(cuit);
  if (x.length !== 11) return false;
  const nums = x.split("").map(Number);
  const base = [5,4,3,2,7,6,5,4,3,2];
  const sum = base.reduce((acc, f, i) => acc + nums[i] * f, 0);
  const mod = sum % 11;
  const check = mod === 0 ? 0 : mod === 1 ? 9 : 11 - mod; // regla AFIP
  return nums[10] === check;
}

export const COMPANY_OPTIONS = [
  "Pulsión y Racional S.A.",
  "Asociación Civil Educadores y Educandos",
];

export const CATEGORY_OPTIONS = [
  "Publicidad",
  "Honorarios Profesionales",
  "Mantenimiento",
  "Mercadería, almacén, refrigerio",
  "Art. de Computación",
  "Telefonía, internet, cable",
  "Fletes, transporte",
  "Gastos de representación, viáticos",
  "Peaje",
  "Seguros",
  "Librería e imprenta",
  "Ropa de trabajo",
  "Muebles y útiles",
  "Materiales de construcción",
  "Gastos varios",
  "Alquileres",
  "Instalaciones",
  "Servicios de agua",
  "Farmacia",
  "Municipal",
  "Otros",
];

export const LOCALITY_OPTIONS = [
  "Mar del Plata",
  "Olavarría",
  "Tandil",
  "Necochea",
  "Santa Teresita",
  "Villa Gesell",
];

// (Opcional) por si querés centralizar también:
export const STATUS_OPTIONS = ["Pendiente", "Pagado"];

export const MONTHS_ES = [
  { v: 0, label: "Todos" },
  { v: 1, label: "Enero" },
  { v: 2, label: "Febrero" },
  { v: 3, label: "Marzo" },
  { v: 4, label: "Abril" },
  { v: 5, label: "Mayo" },
  { v: 6, label: "Junio" },
  { v: 7, label: "Julio" },
  { v: 8, label: "Agosto" },
  { v: 9, label: "Septiembre" },
  { v: 10, label: "Octubre" },
  { v: 11, label: "Noviembre" },
  { v: 12, label: "Diciembre" },
];

export const FILES_BASE =
  import.meta.env.VITE_PUBLIC_FILES_BASE ?? "https://backgdn.universidadsiglo21online.com";

export function toAbsoluteFileUrl(p = "") {
  return /^https?:\/\//i.test(p)
    ? p
    : `${FILES_BASE}${p.startsWith("/") ? "" : "/"}${p}`;
}

// ✅ helper para formatear fechas (lo usa la tabla)
export function fmtDateAR(isoLike) {
  if (!isoLike) return "—";
  const d = new Date(String(isoLike).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return isoLike;
  return d.toLocaleDateString("es-AR");
}


// NUEVO: formateo CUIT -> 11 dígitos => XX-XXXXXXXX-X
export function formatCuit(v) {
  const d = onlyDigits(v ?? "");
  if (d.length !== 11) return v ?? "";
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}