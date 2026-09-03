let listeners = [];

export function subscribeApiStatus(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((f) => f !== fn); };
}

function emit(status) {
  listeners.forEach((fn) => fn(status));
}

export async function apiFetch(url, options = {}) {
  try {
    const r = await fetch(url, options);
    if (r.status === 401) emit({ kind: "auth", message: "Token admin belum diset atau salah. Simpan Admin Token di tab Hubungkan Akun." });
    else if (r.status >= 500) emit({ kind: "server", message: "Server tidak terjangkau (error " + r.status + "). Coba lagi nanti." });
    return r;
  } catch (err) {
    emit({ kind: "network", message: "Koneksi ke server gagal. Periksa internet, lalu coba lagi." });
    throw err;
  }
}