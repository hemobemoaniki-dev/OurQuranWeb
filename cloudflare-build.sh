#!/usr/bin/env bash
set -euo pipefail
rm -rf _site && mkdir -p _site
unzip -q ourquran_v55_calendar_hasanaat_fix.zip -d _site
rm -rf _site/src
find _site -maxdepth 1 -type f -name '*.txt' -delete
rm -f _site/preview.html _site/_headers _site/firestore.rules

# Reuse only the visual stylesheet from V58. Its runtime JS is intentionally NOT loaded.
cp site/v58.css _site/v59.css

python3 - <<'PY'
from pathlib import Path
root=Path('_site')
app=(root/'app.js').read_text()
acc=(root/'account-sync.js').read_text()
idx=(root/'index.html').read_text()

def once(text, old, new, label):
    n=text.count(old)
    if n!=1: raise RuntimeError(f'{label}: expected 1 match, got {n}')
    return text.replace(old,new,1)

# Reader: Bismillah never becomes a counted/displayed ayah.
app=once(app,'  ayah: 1,\n  totalHasanaat:','  ayah: 2,\n  lastJuz: 1,\n  globalAyah: 2,\n  totalHasanaat:','default position')
app=once(app,'    next.totalSeconds = Math.max(Number(next.totalSeconds||0), datedSeconds);\n    return next;','    next.totalSeconds = Math.max(Number(next.totalSeconds||0), datedSeconds);\n    if(Number(next.surah)===1 && Number(next.ayah)<=1) next.ayah=2;\n    next.lastJuz=Math.max(1,Number(next.lastJuz)||1);\n    next.globalAyah=Math.max(1,Number(next.globalAyah)||1);\n    return next;','position migration')
app=once(app,'function populateAyahSelect(total){ els.ayahSelect.innerHTML=Array.from({length:total},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join(""); els.ayahSelect.value=state.ayah; }','function populateAyahSelect(total){ const first=Number(state.surah)===1?2:1; els.ayahSelect.innerHTML=Array.from({length:Math.max(0,total-first+1)},(_,i)=>{const n=i+first;return `<option value="${n}">${n}</option>`;}).join(""); if(Number(state.surah)===1&&Number(state.ayah)<2)state.ayah=2; els.ayahSelect.value=state.ayah; }','ayah selector')
app=once(app,'  state.surah=surahNumber; state.ayah=Math.max(1,Math.min(targetAyah,arabic.numberOfAyahs));','  state.surah=surahNumber; const minimumAyah=Number(surahNumber)===1?2:1; state.ayah=Math.max(minimumAyah,Math.min(targetAyah,arabic.numberOfAyahs));','load surah')
old='''  const opening=splitOpeningBismillah(currentAyah.text,state.surah,state.ayah);
  const visibleVerseText=opening.verseText || currentAyah.text;
  // Count the actual Arabic the reader is shown. For Surah openings where the
  // Bismillah is rendered on its own line, it is still part of what the user reads.
  const rewardText=opening.bismillah ? `${opening.bismillah} ${visibleVerseText}` : visibleVerseText;
  const letters=countArabicLetters(rewardText); currentReward=letters*10;'''
new='''  const opening=splitOpeningBismillah(currentAyah.text,state.surah,state.ayah);
  const visibleVerseText=opening.verseText || (opening.bismillah ? "" : currentAyah.text);
  const letters=countArabicLetters(visibleVerseText); currentReward=letters*10;'''
app=once(app,old,new,'reward logic')
app=once(app,'    els.bismillahText.textContent=opening.bismillah;\n    els.bismillahText.hidden=!opening.bismillah;','    els.bismillahText.textContent="";\n    els.bismillahText.hidden=true;','hide bismillah')
app=once(app,'  els.prevBtn.disabled=state.surah===1&&state.ayah===1;','  els.prevBtn.disabled=state.surah===1&&state.ayah<=2;\n  state.lastJuz=Number(currentAyah.juz)||1; state.globalAyah=Number(currentAyah.number)||1;','position metadata')
app=once(app,'  if(!reciter?.folder || !Number.isInteger(surah) || !Number.isInteger(ayah) || surah<1 || surah>114 || ayah<1) return [];','  if(!reciter?.folder || !Number.isInteger(surah) || !Number.isInteger(ayah) || surah<1 || surah>114 || ayah<1 || (surah===1&&ayah===1)) return [];','audio guard')
app=once(app,'async function goPrevious(){\n  if(isTransitioning) return; stopAudio();','async function goPrevious(){\n  if(isTransitioning || (state.surah===1&&state.ayah<=2)) return; stopAudio();','previous guard')

# Account sync: exact resume fields + do not re-import the same guest session.
acc=once(acc,'    next.surah=Math.max(1,Math.min(114,Number(next.surah)||1));\n    next.ayah=Math.max(1,Number(next.ayah)||1);','    next.surah=Math.max(1,Math.min(114,Number(next.surah)||1));\n    next.ayah=Math.max(1,Number(next.ayah)||1);\n    if(next.surah===1&&next.ayah<=1)next.ayah=2; next.lastJuz=Math.max(1,Number(next.lastJuz)||1); next.globalAyah=Math.max(1,Number(next.globalAyah)||1);','sync normalize')
acc=once(acc,'      merged.surah=Number(local.surah)||1;merged.ayah=Number(local.ayah)||1;','      merged.surah=Number(local.surah)||1;merged.ayah=Number(local.ayah)||1; merged.lastJuz=Number(local.lastJuz)||Number(merged.lastJuz)||1; merged.globalAyah=Number(local.globalAyah)||Number(merged.globalAyah)||1;','merge position')
acc=once(acc,'    if(Number(remote.currentSurah)>0) next.surah=Number(remote.currentSurah);\n    if(Number(remote.currentAyah)>0) next.ayah=Number(remote.currentAyah);','    if(Number(remote.currentSurah)>0) next.surah=Number(remote.currentSurah);\n    if(Number(remote.currentAyah)>0) next.ayah=Number(remote.currentAyah);\n    if(Number(remote.currentJuz)>0) next.lastJuz=Number(remote.currentJuz); if(Number(remote.currentGlobalAyah)>0) next.globalAyah=Number(remote.currentGlobalAyah); if(next.surah===1&&next.ayah<=1)next.ayah=2;','hydrate position')
acc=once(acc,'      currentSurah:Number(next.surah)||1,\n      currentAyah:Number(next.ayah)||1,','      currentSurah:Number(next.surah)||1,\n      currentAyah:Number(next.ayah)||1,\n      currentJuz:Number(next.lastJuz)||1,\n      currentGlobalAyah:Number(next.globalAyah)||1,','cloud position')
acc=once(acc,'        chosen=merged.state;\n        shouldPush=shouldPush||merged.imported;','        chosen=merged.state;\n        shouldPush=shouldPush||merged.imported;\n        if(merged.imported){try{localStorage.setItem(GUEST_KEY,JSON.stringify(neutralGuestState(deepDefaultState())));}catch{}}','guest import')

# Dock sync chip in the real header without changing its ID/listeners.
block='''  <button id="guestUnsavedBubble" class="guest-unsaved-bubble" data-state="guest" type="button" aria-label="Not syncing. Sign in or sign up to sync your progress">
    <span class="guest-unsaved-dot" aria-hidden="true"></span>
    <span class="guest-unsaved-copy"><strong id="oq38SyncBubbleTitle">Not syncing</strong><small id="oq38SyncBubbleText">Sign in / Sign up</small></span>
    <span id="oq38SyncBubbleArrow" class="guest-unsaved-arrow" aria-hidden="true">→</span>
  </button>
'''
if idx.count(block)!=1: raise RuntimeError('sync chip block mismatch')
idx=idx.replace(block,'',1)
docked=block.replace('class="guest-unsaved-bubble"','class="guest-unsaved-bubble v58-sync-chip"')
anchor='''      </button>

      <div class="site-utility-actions" aria-label="OurQuran support and feedback">'''
idx=once(idx,anchor,'      </button>\n\n'+docked+'\n      <div class="site-utility-actions" aria-label="OurQuran support and feedback">','dock sync')

# Replace the most visible placeholder symbols with inline SVG.
I={
'brand':'<svg viewBox="0 0 24 24"><path d="M5 7.5c2.2-1.5 4.5-1.6 7-.2v10.2c-2.5-1.4-4.8-1.3-7 .2V7.5Z"/><path d="M19 7.5c-2.2-1.5-4.5-1.6-7-.2v10.2c2.5-1.4 4.8-1.3 7 .2V7.5Z"/><path d="M12 7v11"/></svg>',
'home':'<svg viewBox="0 0 24 24"><path d="m4 11 8-7 8 7"/><path d="M6.5 10.5V20h11v-9.5"/><path d="M9.5 20v-6h5v6"/></svg>',
'set':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.5 1a8 8 0 0 0-1.7-1L14.4 3h-4.8l-.3 3.1a8 8 0 0 0-1.7 1l-2.5-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.5-1a8 8 0 0 0 1.7 1l.3 3.1h4.8l.3-3.1a8 8 0 0 0 1.7-1l2.5 1 2-3.4-2-1.5"/></svg>',
'profile':'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c.8-4.2 3.3-6.3 7.5-6.3s6.7 2.1 7.5 6.3"/></svg>',
'sun':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></svg>',
'names':'<svg viewBox="0 0 24 24"><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z"/></svg>',
'heart':'<svg viewBox="0 0 24 24"><path d="M20.8 5.8c-1.8-2-5-2.2-7.1-.3L12 7l-1.7-1.5C8.2 3.6 5 3.8 3.2 5.8 1 8.2 1.3 12 3.7 14.2L12 22l8.3-7.8c2.4-2.2 2.7-6 .5-8.4Z"/></svg>',
'ayah':'<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 9h6v6H9z"/></svg>',
'clock':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>'
}
idx=once(idx,'<div class="brand-mark" aria-hidden="true">◈</div>',f'<div class="brand-mark" aria-hidden="true">{I["brand"]}</div>','brand')
idx=once(idx,'<span class="gold-heart3d" aria-hidden="true"></span>',f'<span class="gold-heart3d" aria-hidden="true">{I["heart"]}</span>','heart')
idx=once(idx,'<span class="stat-icon">▣</span>',f'<span class="stat-icon">{I["ayah"]}</span>','ayah icon')
idx=once(idx,'<span class="stat-icon session-clock-icon" aria-hidden="true">◷</span>',f'<span class="stat-icon session-clock-icon" aria-hidden="true">{I["clock"]}</span>','clock')
idx=once(idx,'<span class="bottom-nav-icon">⌂</span>',f'<span class="bottom-nav-icon">{I["home"]}</span>','home')
idx=once(idx,'<span class="bottom-nav-icon">⚙</span>',f'<span class="bottom-nav-icon">{I["set"]}</span>','settings')
idx=once(idx,'<span class="bottom-nav-icon">◉</span>',f'<span class="bottom-nav-icon">{I["profile"]}</span>','profile')
idx=once(idx,'<span class="bottom-nav-icon">☀</span>',f'<span class="bottom-nav-icon">{I["sun"]}</span>','adhkar')
idx=once(idx,'<span class="bottom-nav-icon arabic-nav">الله</span>',f'<span class="bottom-nav-icon arabic-nav">{I["names"]}</span>','names')

# Visual layer and a tiny isolated reciter-preview enhancement. No core function overrides.
idx=idx.replace('</head>','  <link rel="stylesheet" href="v59.css?v=59" />\n</head>')
preview=r'''<script>
(()=>{try{
const folders={"mishary-alafasy":"Alafasy_128kbps","muhammad-ayyoub":"Muhammad_Ayyoub_128kbps","sudais":"Abdurrahmaan_As-Sudais_192kbps","ali-jaber":"Ali_Jaber_64kbps","minshawy":"Minshawy_Murattal_128kbps"};
const s=document.getElementById("reciterSelect"),host=document.getElementById("reciterSetting");if(!s||!host)return;
s.classList.add("v58-native-select");const list=document.createElement("div");list.className="v58-reciter-list";host.appendChild(list);
let audio=null,btn=null;const stop=()=>{if(audio){try{audio.pause();audio.currentTime=0}catch{}}if(btn){btn.dataset.state="idle";btn.querySelector(".v58-preview-label").textContent="Preview"}audio=null;btn=null};
const draw=()=>{list.innerHTML="";[...s.options].forEach(o=>{if(!folders[o.value])return;const row=document.createElement("div");row.className="v58-reciter-row";row.dataset.reciter=o.value;row.innerHTML=`<button class="v58-reciter-choice" type="button"><span class="v58-reciter-orb">♫</span><span><strong>${o.textContent}</strong><small>Ayat al-Kursi • 2:255</small></span><span class="v58-selected-mark">✓</span></button><button class="v58-reciter-preview" type="button"><span class="v58-preview-label">Preview</span></button>`;row.querySelector(".v58-reciter-choice").onclick=()=>{s.value=o.value;s.dispatchEvent(new Event("change",{bubbles:true}));mark()};row.querySelector(".v58-reciter-preview").onclick=async e=>{if(btn===e.currentTarget&&audio&&!audio.paused){stop();return}stop();btn=e.currentTarget;btn.dataset.state="loading";btn.querySelector(".v58-preview-label").textContent="Loading";audio=new Audio(`https://everyayah.com/data/${folders[o.value]}/002255.mp3`);audio.onplaying=()=>{if(btn){btn.dataset.state="playing";btn.querySelector(".v58-preview-label").textContent="Playing"}};audio.onended=stop;audio.onerror=stop;try{await audio.play()}catch{stop()}};list.appendChild(row)});mark()};
const mark=()=>list.querySelectorAll(".v58-reciter-row").forEach(r=>r.classList.toggle("selected",r.dataset.reciter===s.value));draw();s.addEventListener("change",mark);
}catch(e){console.error("Reciter previews failed",e)}})();
</script>'''
idx=idx.replace('</body>',preview+'\n</body>')

(root/'app.js').write_text(app)
(root/'account-sync.js').write_text(acc)
(root/'index.html').write_text(idx)

config=root/'site-config.js'
if config.exists():
    t=config.read_text()
    for old in ('https://ourquran.netlify.app/','https://hemobemoaniki-dev.github.io/OurQuranWeb/','https://ourquran.com/'): t=t.replace(old,'https://ourquran.pages.dev/')
    config.write_text(t)
manifest=root/'manifest.webmanifest'
if manifest.exists():
    manifest.write_text(manifest.read_text().replace('"start_url": "./"','"start_url": "/"').replace('"scope": "./"','"scope": "/"'))
PY

node --check _site/app.js
node --check _site/account-sync.js
grep -q '002255.mp3' _site/index.html
grep -q 'currentGlobalAyah' _site/account-sync.js
grep -q 'v59.css?v=59' _site/index.html
! grep -q 'v58.js' _site/index.html
touch _site/.nojekyll
