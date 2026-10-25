var kunang = document.getElementById("kunang");

for (var n = 0; n < 24; n++) {
  var titik = document.createElement("span");
  var ukuran = 3 + Math.random() * 5;
  titik.style.left = Math.random() * 100 + "%";
  titik.style.top = 20 + Math.random() * 80 + "%";
  titik.style.width = ukuran + "px";
  titik.style.height = ukuran + "px";
  titik.style.animationDuration = 9 + Math.random() * 10 + "s";
  titik.style.animationDelay = -Math.random() * 15 + "s";
  kunang.appendChild(titik);
}

var waktuAcara = new Date("2026-12-20T09:00:00+07:00").getTime();

function hitungMundur() {
  var sisa = Math.max(0, Math.floor((waktuAcara - Date.now()) / 1000));
  document.getElementById("hari").textContent = Math.floor(sisa / 86400);
  document.getElementById("jam").textContent = Math.floor((sisa % 86400) / 3600);
  document.getElementById("menit").textContent = Math.floor((sisa % 3600) / 60);
  document.getElementById("detik").textContent = sisa % 60;
}

hitungMundur();
setInterval(hitungMundur, 1000);

var modalFoto = document.getElementById("modalFoto");
var fotoBesar = document.getElementById("fotoBesar");
var daftarFoto = Array.prototype.map.call(document.querySelectorAll(".tombol-foto"), function (t) {
  return t.getAttribute("data-foto");
});
var noFoto = 0;

function tampilFoto(no) {
  noFoto = (no + daftarFoto.length) % daftarFoto.length;
  fotoBesar.src = daftarFoto[noFoto];
  fotoBesar.alt = "Galeri foto " + (noFoto + 1) + " dari " + daftarFoto.length;
}

modalFoto.addEventListener("show.bs.modal", function (e) {
  tampilFoto(Number(e.relatedTarget.getAttribute("data-no")));
});

document.getElementById("fotoSebelumnya").addEventListener("click", function () {
  tampilFoto(noFoto - 1);
});

document.getElementById("fotoBerikutnya").addEventListener("click", function () {
  tampilFoto(noFoto + 1);
});

modalFoto.addEventListener("keydown", function (e) {
  if (e.key === "ArrowLeft") tampilFoto(noFoto - 1);
  if (e.key === "ArrowRight") tampilFoto(noFoto + 1);
});

var awalSentuh = 0;

fotoBesar.addEventListener("touchstart", function (e) {
  awalSentuh = e.changedTouches[0].clientX;
});

fotoBesar.addEventListener("touchend", function (e) {
  var selisih = e.changedTouches[0].clientX - awalSentuh;
  if (Math.abs(selisih) > 40) tampilFoto(noFoto + (selisih < 0 ? 1 : -1));
});

var daftarUcapan = document.getElementById("daftarUcapan");
var pesanOk = document.getElementById("pesanOk");

function waktuUcapan(ms) {
  return new Date(ms).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function tampilUcapan(daftar) {
  daftarUcapan.textContent = "";

  if (!daftar.length) {
    daftarUcapan.className = "text-center text-body-secondary mt-4";
    daftarUcapan.textContent = "Belum ada ucapan. Jadilah yang pertama memberi ucapan.";
    return;
  }

  daftarUcapan.className = "vstack gap-3 mt-4";
  daftar.forEach(function (u) {
    var item = document.createElement("div");
    var judul = document.createElement("strong");
    var waktu = document.createElement("small");
    var isi = document.createElement("p");
    item.className = "ucapan-item";
    isi.className = "mb-0 mt-1";
    judul.textContent = u.nama + " (" + u.hadir + ")";
    waktu.textContent = " " + waktuUcapan(u.waktu);
    isi.textContent = u.ucapan;
    item.appendChild(judul);
    item.appendChild(waktu);
    item.appendChild(isi);
    daftarUcapan.appendChild(item);
  });
}

function muatUcapan() {
  fetch("/api/ucapan", { cache: "no-store" })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(tampilUcapan)
    .catch(function (err) {
      console.error("Ucapan gagal dimuat:", err.message);
      if (!daftarUcapan.querySelector(".ucapan-item")) tampilUcapan([]);
    });
}

muatUcapan();
setInterval(muatUcapan, 30000);

document.getElementById("formRsvp").addEventListener("submit", function (e) {
  e.preventDefault();
  var form = e.target;
  var tombol = document.getElementById("kirimUcapan");
  var data = new FormData(form);
  var nama = data.get("nama").trim();

  tombol.disabled = true;
  pesanOk.className = "text-center ikon-emas mt-4 mb-0";
  pesanOk.textContent = "Mengirim...";

  fetch("/api/ucapan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nama: nama,
      hadir: data.get("hadir"),
      jumlah: data.get("jumlah"),
      ucapan: (data.get("ucapan") || "").trim(),
      web: data.get("web")
    })
  })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      pesanOk.textContent = "Terima kasih, " + nama + ". Konfirmasi Anda sudah tercatat.";
      form.reset();
      muatUcapan();
    })
    .catch(function (err) {
      console.error("Konfirmasi gagal dikirim:", err.message);
      pesanOk.className = "text-center galat mt-4 mb-0";
      pesanOk.textContent = "Maaf, konfirmasi belum terkirim. Silakan coba lagi.";
    })
    .finally(function () {
      tombol.disabled = false;
    });
});
