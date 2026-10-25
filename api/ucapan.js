function cari(akhiran) {
  const nama = Object.keys(process.env).find((n) => n.endsWith(akhiran) && !n.includes("READ_ONLY"));
  return nama ? process.env[nama] : undefined;
}

const REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || cari("REST_API_URL") || cari("REDIS_REST_URL");
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || cari("REST_API_TOKEN") || cari("REDIS_REST_TOKEN");
const TCP_URL = process.env.REDIS_URL || cari("REDIS_URL");
const KUNCI = "ucapan-undangan";
const PILIHAN_HADIR = ["Hadir", "Mungkin hadir", "Tidak hadir"];

async function lewatRest(daftar) {
  const hasil = [];
  for (const perintah of daftar) {
    const r = await fetch(REST_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + REST_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(perintah)
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    hasil.push(j.result);
  }
  return hasil;
}

async function lewatTcp(daftar) {
  const { createClient } = require("redis");
  const klien = createClient({ url: TCP_URL, socket: { connectTimeout: 5000, reconnectStrategy: false } });
  klien.on("error", () => {});
  await klien.connect();
  try {
    const hasil = [];
    for (const perintah of daftar) hasil.push(await klien.sendCommand(perintah.map(String)));
    return hasil;
  } finally {
    await klien.quit().catch(() => {});
  }
}

async function jalankan(daftar) {
  if (REST_URL && REST_TOKEN) return lewatRest(daftar);
  if (TCP_URL) return lewatTcp(daftar);
  throw new Error("variabel penyimpanan tidak ditemukan");
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method === "GET") {
      const [hasil] = await jalankan([["LRANGE", KUNCI, 0, 199]]);
      const daftar = hasil.map((s) => JSON.parse(s)).filter((u) => u.ucapan).slice(0, 50);
      return res.status(200).json(daftar);
    }

    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      if (b.web) return res.status(200).json({ ok: true });

      const nama = String(b.nama || "").trim().slice(0, 40);
      const ucapan = String(b.ucapan || "").trim().slice(0, 300);
      const hadir = PILIHAN_HADIR.includes(b.hadir) ? b.hadir : "Hadir";
      const jumlah = ["1", "2", "3", "4"].includes(String(b.jumlah)) ? String(b.jumlah) : "1";

      if (!nama) return res.status(400).json({ pesan: "Nama wajib diisi." });

      const item = { nama, ucapan, hadir, jumlah, waktu: Date.now() };
      await jalankan([["LPUSH", KUNCI, JSON.stringify(item)], ["LTRIM", KUNCI, 0, 499]]);
      return res.status(201).json(item);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ pesan: "Metode tidak didukung." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ pesan: "Terjadi kesalahan, coba lagi.", detail: String(e.message).slice(0, 120) });
  }
};
