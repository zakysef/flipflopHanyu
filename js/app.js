(() => {
const $ = s => document.querySelector(s);
const store = (k, v) => { try { return v === undefined ? JSON.parse(localStorage.getItem(k)) : localStorage.setItem(k, JSON.stringify(v)); } catch { return null; } };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const key = d => d.h + '|' + d.p;

let index = [], cache = {}, deck = [], i = 0;
let sel = new Set(store('sel') || []);
let opt = Object.assign({ hp: false, ha: false, shuf: false, hard: false }, store('opt') || {});
let marks = store('marks') || {};

/* ---------- data ---------- */
async function build() {
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
  deck = d; i = 0; render();
}

/* ---------- render ---------- */
const slot = (cls, hide, txt) => `<div class="${cls}${hide ? ' hid' : ''}"><span>${esc(txt)}</span></div>`;
function render() {
  const card = $('#card'); card.classList.remove('flipped');
  const d = deck[i];
  const ok = deck.filter(x => marks[key(x)] === 'ok').length;
  $('#info').textContent = `${sel.size} bab dipilih · ${deck.length} kartu · hafal ${ok}`;
  $('#count').textContent = deck.length ? `${i + 1} / ${deck.length}` : '0 / 0';
  if (!d) {
    $('#front').innerHTML = `<div class="id">${opt.hard ? 'Belum ada kata yang ditandai sulit.' : 'Pilih minimal satu bab.'}</div>`;
    $('#back').innerHTML = ''; return;
  }
  $('#front').innerHTML = `<span class="tag">Bab ${d.bab}</span><div class="hanzi" lang="zh-Hans">${esc(d.h)}</div>` + slot('py', opt.hp, d.p) + slot('id', opt.ha, d.a);
  $('#back').innerHTML = `<span class="tag">Contoh kalimat</span><div class="sent" lang="zh-Hans">${esc(d.ch)}</div>` + slot('py', opt.hp, d.cp) + slot('id', opt.ha, d.ca) +
    (d.g ? `<div class="gram"><b>Tata bahasa:</b> ${esc(d.g)}</div>` : '');
  ['hard', 'ok'].forEach(m => document.querySelector(`[data-mark=${m}]`).classList.toggle('on', marks[key(d)] === m));
}
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
  if (document.querySelector('dialog[open]') || /BUTTON|INPUT/.test(e.target.tagName)) return;
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
function speak(t) {
  const s = window.speechSynthesis; if (!s) return alert('Peramban ini tidak mendukung suara.');
  s.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-CN'; u.rate = .8;
  const v = s.getVoices().find(v => v.lang.replace('_', '-').startsWith('zh')); if (v) u.voice = v;
  s.speak(u);
}
$('#btnAudio').onclick = () => { const d = deck[i]; if (d) speak($('#card').classList.contains('flipped') ? d.ch : d.h); };

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
  const chars = [...d.h].filter(c => /[\u4e00-\u9fff]/.test(c));
  $('#strokeTitle').textContent = `Urutan guratan · ${d.h}`;
  const wrap = $('#writers'); wrap.innerHTML = '';
  if (!window.HanziWriter) { wrap.innerHTML = '<p class="err">Library guratan gagal dimuat.</p>'; }
  chars.forEach(ch => {
    const el = document.createElement('div'); el.className = 'w';
    el.innerHTML = '<div class="box"></div><div class="row"><button>▶ Animasi</button><button>✎ Latihan</button></div><div class="err"></div>';
    wrap.append(el);
    if (!window.HanziWriter) return;
    const w = HanziWriter.create(el.querySelector('.box'), ch, {
      width: 170, height: 170, padding: 8, strokeColor: '#5E1420', radicalColor: '#B22A2E',
      outlineColor: '#E6D5B8', strokeAnimationSpeed: 1.2, delayBetweenStrokes: 250,
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

/* ---------- init ---------- */
(async () => {
  try { index = await (await fetch('data/index.json')).json(); }
  catch { $('#info').textContent = 'Gagal memuat data. Buka lewat server/GitHub Pages, bukan file://'; return; }
  if (!sel.size) sel = new Set(index.map(c => c.bab));
  labelPick(); build();
})();
})();
