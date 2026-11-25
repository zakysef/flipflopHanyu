(() => {
const $ = s => document.querySelector(s);
const store = (k, v) => { try { return v === undefined ? JSON.parse(localStorage.getItem(k)) : localStorage.setItem(k, JSON.stringify(v)); } catch { return null; } };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const key = d => d.h + '|' + d.p;

let index = [], cache = {}, deck = [], i = 0, label = '', mode = 'vocab', radData = [], radCh = null, groups = null;
let sel = new Set(store('sel') || []);
let opt = Object.assign({ hp: false, ha: false, shuf: false, hard: false }, store('opt') || {});
let marks = store('marks') || {};

/* ---------- data ---------- */
async function build() {
  if (mode === 'rad') {
    let d = radData.map(x => ({ h: x.r, p: x.np, a: `${x.n} · ${x.k}`, rad: true, no: x.no, n: x.n, f: x.f, ex: x.ex }));
    if (opt.hard) d = d.filter(x => marks[key(x)] === 'hard');
    if (opt.shuf) for (let k = d.length - 1; k > 0; k--) { const j = Math.random() * (k + 1) | 0; [d[k], d[j]] = [d[j], d[k]]; }
    deck = d; i = 0; label = ''; render(); return;
  }
  const need = [...sel].filter(b => !cache[b]);
  try {
    await Promise.all(need.map(async b => {
      const r = await fetch(`data/bab-${String(b).padStart(2, '0')}.json`);
      cache[b] = await r.json();
    }));
  } catch { $('#info').textContent = 'Gagal memuat data. Buka lewat server/GitHub Pages, bukan file://'; return; }
  let d = [...sel].sort((a, b) => a - b).flatMap(b => cache[b].map(x => ({ ...x, bab: b })));
  if (opt.hard) d = d.filter(x => marks[key(x)] === 'hard');
  if (opt.shuf) for (let k = d.length - 1; k > 0; k--) { const j = Math.random() * (k + 1) | 0; [d[k], d[j]] = [d[j], d[k]]; }
  deck = d; i = 0; label = ''; render();
}

/* ---------- render ---------- */
const slot = (cls, hide, txt) => `<div class="${cls}${hide ? ' hid' : ''}"><span>${esc(txt)}</span></div>`;
function render() {
  const card = $('#card'); card.classList.remove('flipped');
  const d = deck[i];
  const ok = deck.filter(x => marks[key(x)] === 'ok').length;
  $('#info').textContent = mode === 'rad' ? `${deck.length} kartu radikal · hafal ${ok}` : label ? `${label} · ${deck.length} kartu · pilih Bab untuk kembali` : `${sel.size} bab dipilih · ${deck.length} kartu · hafal ${ok}`;
  $('#count').textContent = deck.length ? `${i + 1} / ${deck.length}` : '0 / 0';
  if (!d) {
    $('#front').innerHTML = `<div class="id">${opt.hard ? 'Belum ada kata yang ditandai sulit.' : 'Pilih minimal satu bab.'}</div>`;
    $('#back').innerHTML = ''; return;
  }
  $('#front').innerHTML = `<span class="tag">${d.rad ? 'Radikal ' + d.no : 'Bab ' + d.bab}</span><div class="hanzi" lang="zh-Hans">${esc(d.h)}</div>` + slot('py', opt.hp, d.p) + slot('id', opt.ha, d.a);
  $('#back').innerHTML = d.rad ? radBack(d) : `<span class="tag">Contoh kalimat</span><div class="sent" lang="zh-Hans">${esc(d.ch)}</div>` + slot('py', opt.hp, d.cp) + slot('id', opt.ha, d.ca) +
    (d.g ? `<div class="gram"><b>Tata bahasa:</b> ${esc(d.g)}</div>` : '');
  ['hard', 'ok'].forEach(m => document.querySelector(`[data-mark=${m}]`).classList.toggle('on', marks[key(d)] === m));
}
const radBack = d => `<span class="tag">Fungsi</span><div class="gram">${esc(d.f)}</div><div class="ex">${d.ex.map(e => `<span><b class="exh" lang="zh-Hans">${esc(e.h)}</b>${esc(e.p)}<br>${esc(e.a)}</span>`).join('')}</div>`;
const go = n => { if (!deck.length) return; i = (i + n + deck.length) % deck.length; render(); };

/* ---------- events ---------- */
$('#card').addEventListener('click', e => {
  const h = e.target.closest('.hid');
  if (h) { h.classList.remove('hid'); return; }
  $('#card').classList.toggle('flipped');
});
$('#card').addEventListener('keydown', e => { if (e.key === 'Enter') $('#card').classList.toggle('flipped'); });
$('#prev').onclick = () => go(-1);
$('#next').onclick = () => go(1);
document.addEventListener('keydown', e => {
  if (mode === 'group' || document.querySelector('dialog[open]') || /BUTTON|INPUT/.test(e.target.tagName)) return;
  if (e.key === 'ArrowRight') go(1);
  if (e.key === 'ArrowLeft') go(-1);
  if (e.code === 'Space') { e.preventDefault(); $('#card').classList.toggle('flipped'); }
});
let x0 = null;
$('#card').addEventListener('touchstart', e => x0 = e.touches[0].clientX, { passive: true });
$('#card').addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1); });

document.querySelectorAll('[data-opt]').forEach(b => {
  b.setAttribute('aria-pressed', opt[b.dataset.opt]);
  b.onclick = () => {
    opt[b.dataset.opt] = !opt[b.dataset.opt];
    b.setAttribute('aria-pressed', opt[b.dataset.opt]); store('opt', opt); build();
  };
});
document.querySelectorAll('[data-mark]').forEach(b => b.onclick = () => {
  const d = deck[i]; if (!d) return;
  marks[key(d)] = marks[key(d)] === b.dataset.mark ? undefined : b.dataset.mark;
  store('marks', marks); render();
});

/* ---------- audio ---------- */
let voices = [];
const loadV = () => voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
loadV(); if (window.speechSynthesis) speechSynthesis.onvoiceschanged = loadV;
function pickVoice() {
  const L = v => v.lang.replace('_', '-');
  const zh = voices.filter(v => /^zh/i.test(L(v)));
  const cn = zh.filter(v => /^zh-CN/i.test(L(v)) || /Mandarin|普通话|Putonghua/i.test(v.name));
  const pool = cn.length ? cn : zh.filter(v => !/HK|TW|yue|Cantonese|粤|廣|臺|台/i.test(L(v) + v.name));
  return pool.find(v => /Natural|Online|Xiaoxiao|Yunxi|Google/i.test(v.name)) || pool[0] || null;
}
function speak(t) {
  const s = window.speechSynthesis; if (!s) return alert('Peramban ini tidak mendukung suara.');
  s.cancel(); const u = new SpeechSynthesisUtterance(t.replace(/[()（）…]/g, ''));
  const v = pickVoice(); if (v) u.voice = v; u.lang = v ? v.lang : 'zh-CN'; u.rate = .75;
  s.speak(u);
}
$('#btnAudio').onclick = () => { const d = deck[i]; if (d) speak(d.rad ? d.n : $('#card').classList.contains('flipped') ? d.ch : d.h); };

/* ---------- pilih bab ---------- */
function drawChips() {
  $('#chips').innerHTML = index.map(c => `<label><input type="checkbox" value="${c.bab}" ${sel.has(c.bab) ? 'checked' : ''}>Bab ${c.bab}</label>`).join('');
}
$('#btnPick').onclick = () => { drawChips(); $('#pick').showModal(); };
document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
  const q = b.dataset.q;
  sel = new Set(index.filter(c => q === 'all' || (q === 'h1' && c.book === 'H1') || (q === 'h2' && c.book === 'H2')).map(c => c.bab));
  drawChips();
});
$('#applyPick').onclick = () => {
  sel = new Set([...document.querySelectorAll('#chips input:checked')].map(x => +x.value));
  store('sel', [...sel]); $('#pick').close(); labelPick(); build();
};
const labelPick = () => $('#btnPick').textContent = sel.size === index.length ? 'Bab: semua ▾' : `Bab: ${sel.size} ▾`;

/* ---------- guratan ---------- */
$('#btnStroke').onclick = () => {
  const d = deck[i]; if (!d) return;
  const chars = d.rad ? [d.h] : [...d.h].filter(c => /[\u4e00-\u9fff]/.test(c));
  $('#strokeTitle').textContent = `Urutan guratan · ${d.h}`;
  const wrap = $('#writers'); wrap.innerHTML = '';
  if (!window.HanziWriter) { wrap.innerHTML = '<p class="err">Library guratan gagal dimuat.</p>'; }
  chars.forEach(ch => {
    const el = document.createElement('div'); el.className = 'w';
    el.innerHTML = '<div class="box"></div><div class="row"><button>▶ Animasi</button><button>✎ Latihan</button></div><div class="err"></div>';
    wrap.append(el);
    if (!window.HanziWriter) return;
    const w = HanziWriter.create(el.querySelector('.box'), ch, {
      width: 170, height: 170, padding: 8, strokeColor: '#43334c', radicalColor: '#e83c91',
      outlineColor: '#f0d6e4',
      charDataLoader: (c, ok, bad) => d.rad && radCh && radCh[c] ? ok(radCh[c]) : HanziWriter.loadCharacterData(c).then(ok).catch(bad), strokeAnimationSpeed: 0.6, delayBetweenStrokes: 700,
      onLoadCharDataError: () => el.querySelector('.err').textContent = 'Data guratan tidak tersedia (cek koneksi).'
    });
    const [a, q] = el.querySelectorAll('button');
    a.onclick = () => { w.cancelQuiz(); w.showCharacter(); w.animateCharacter(); };
    q.onclick = () => w.quiz();
    w.animateCharacter();
  });
  $('#stroke').showModal();
};
$('#closeStroke').onclick = () => $('#stroke').close();

/* ---------- cari ---------- */
const norm = s => String(s).replace(/[üǖǘǚǜ]/gi, 'v').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
let all = null, found = [];
async function loadAll() {
  if (all) return all;
  await Promise.all(index.filter(c => !cache[c.bab]).map(async c => { cache[c.bab] = await (await fetch(`data/bab-${String(c.bab).padStart(2, '0')}.json`)).json(); }));
  return all = index.flatMap(c => cache[c.bab].map(x => ({ ...x, bab: c.bab })));
}
function search(q) {
  q = q.trim(); if (!q) return [];
  const qa = norm(q), qp = qa.replace(/\s+/g, '').replace(/[1-5]/g, ''), out = [];
  for (const d of all) {
    const pn = norm(d.p).replace(/\s+/g, ''), an = norm(d.a); let s = 9;
    if (d.h === q || (qp && pn === qp) || an === qa) s = 0;
    else if (d.h.startsWith(q) || (qp && pn.startsWith(qp)) || an.startsWith(qa)) s = 1;
    else if (d.h.includes(q) || (qp && pn.includes(qp)) || an.includes(qa)) s = 2;
    if (s < 9) out.push([s, d]);
  }
  return out.sort((a, b) => a[0] - b[0]).map(x => x[1]);
}
function showResults() {
  found = search($('#q').value).slice(0, 60);
  $('#results').innerHTML = found.length
    ? found.map((d, k) => `<li><button data-k="${k}"><span class="rh" lang="zh-Hans">${esc(d.h)}</span><span class="rp">${esc(d.p)}</span><span class="ra">${esc(d.a)}</span><span class="rb">Bab ${d.bab}</span></button></li>`).join('')
    : `<li class="none">${$('#q').value.trim() ? 'Tidak ditemukan.' : 'Ketik hanzi, pinyin (boleh tanpa nada), atau arti.'}</li>`;
}
$('#btnSearch').onclick = async () => {
  $('#search').showModal(); $('#q').focus(); $('#results').innerHTML = '<li class="none">Memuat…</li>';
  try { await loadAll(); showResults(); } catch { $('#results').innerHTML = '<li class="none">Gagal memuat data.</li>'; }
};
$('#q').addEventListener('input', () => { if (all) showResults(); });
$('#results').addEventListener('click', e => {
  const b = e.target.closest('button[data-k]'); if (!b) return;
  deck = found.slice(); i = +b.dataset.k; label = `Hasil "${$('#q').value.trim()}"`;
  $('#search').close(); render();
});
$('#closeSearch').onclick = () => $('#search').close();

/* ---------- mode & kelompok radikal ---------- */
function setMode(m, keep) {
  mode = m;
  document.querySelectorAll('.tabs [data-mode]').forEach(x => x.setAttribute('aria-selected', x.dataset.mode === m));
  $('#viewCards').hidden = m === 'group'; $('#viewGroup').hidden = m !== 'group';
  document.querySelectorAll('[data-only]').forEach(x => x.hidden = x.dataset.only !== m);
  if (m === 'group') drawGroups(); else if (!keep) build();
}
document.querySelectorAll('.tabs [data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
async function drawGroups() {
  if (!groups) { try { groups = await (await fetch('data/kelompok.json')).json(); } catch { $('#groups').textContent = 'Gagal memuat data.'; return; } }
  const info = Object.fromEntries(radData.map(x => [x.r, x]));
  $('#info').textContent = `${groups.length} radikal · ${groups.reduce((n, g) => n + g.c.length, 0)} aksara`;
  $('#groups').innerHTML = groups.map(g => { const x = info[g.r]; return `<details><summary><span class="gr" lang="zh-Hans">${esc(g.r)}</span><span class="gi"><b>${x ? esc(x.n + ' · ' + x.np) : 'Radikal ' + esc(g.r)}</b>${x ? esc(x.k) : 'Belum ada keterangan'}</span><span class="gn">${g.c.length}</span></summary><div class="gc">${g.c.map(([c, b]) => `<button data-c="${esc(c)}" title="Bab ${b}" lang="zh-Hans">${esc(c)}</button>`).join('')}</div></details>`; }).join('');
}
$('#groups').addEventListener('click', async e => {
  const b = e.target.closest('button[data-c]'); if (!b) return;
  const c = b.dataset.c; await loadAll();
  deck = all.filter(d => d.h.includes(c)); i = 0; label = `Aksara "${c}"`;
  setMode('vocab', true); render();
});

/* ---------- init ---------- */
(async () => {
  try { index = await (await fetch('data/index.json')).json(); }
  catch { $('#info').textContent = 'Gagal memuat data. Buka lewat server/GitHub Pages, bukan file://'; return; }
  if (!sel.size) sel = new Set(index.map(c => c.bab));
  try { radData = (await (await fetch('data/radikal.json')).json()).data; radCh = await (await fetch('data/radikal-guratan.json')).json(); } catch { radData = []; }
  labelPick(); setMode('vocab');
})();
})();
