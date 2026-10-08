/** Ventanas emergentes estilo SweetAlert2 (se cargan solo en el navegador). */
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function swal() {
  const mod = await import("sweetalert2");
  return mod.default;
}

const base = {
  customClass: { popup: "rmv-pop" },
  heightAuto: false,
  confirmButtonText: "Aceptar",
};

function tabla(filas: Array<[string, string]>, folio?: string) {
  const det = filas.map(([k, v]) => `<div><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join("");
  const fol = folio ? `<div><span>Folio</span><span class="rmv-folio">${esc(folio)}</span></div>` : "";
  return `<div class="rmv-det">${det}${fol}</div>`;
}

export async function popupRegistrada(filas: Array<[string, string]>, folio: string) {
  const Swal = await swal();
  return Swal.fire({ ...base, icon: "success", title: "Operación registrada en el sistema", html: tabla(filas, folio) });
}

export async function popupConfirmar(titulo: string, filas: Array<[string, string]>): Promise<boolean> {
  const Swal = await swal();
  const r = await Swal.fire({
    ...base,
    icon: "question",
    title: titulo,
    html: tabla(filas),
    showCancelButton: true,
    confirmButtonText: "Confirmar",
    cancelButtonText: "Cancelar",
    reverseButtons: true,
  });
  return r.isConfirmed;
}

export async function popupAviso(titulo: string, texto: string, icon: "warning" | "info" | "error" = "warning") {
  const Swal = await swal();
  return Swal.fire({ ...base, icon, title: titulo, text: texto });
}
