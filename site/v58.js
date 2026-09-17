/* OurQuran V58 — clean UI + correctness layer. Loaded after app.js and account-sync.js. */
(()=>{
  const $=(sel,root=document)=>root.querySelector(sel);
  const $$=(sel,root=document)=>Array.from(root.querySelectorAll(sel));

  /* ---------- Core correctness: never count/show/play the opening Bismillah ---------- */
  const BISMILLAH_LETTERS="بسماللهالرحمنالرحيم";
  const normalizeLetter=ch=>/[ٱأإآ]/u.test(ch)?"ا":ch;
  function stripLeadingBismillah(text){
    const source=String(text||"").replace(/^\uFEFF/,"");
    let built="", boundary=-1, started=false;
    for(let i=0;i<source.length;i++){
      const raw=source[i];
      const ch=normalizeLetter(raw);
      if(/\p{Script=Arabic}/u.test(ch)&&/\p{Letter}/u.test(ch)){
        started=true;
        built+=ch;
        if(!BISMILLAH_LETTERS.startsWith(built)) return source.trim();
        if(built===BISMILLAH_LETTERS){boundary=i+1;break;}
      }else if(!started && /[^\s\p{Mark}]/u.test(ch)){
        return source.trim();
      }
    }
    if(boundary<0) return source.trim();
    while(boundary<source.length && /[\s\p{Mark}۝۞﴿﴾]/u.test(source[boundary])) boundary++;
    return source.slice(boundary).trim();
  }
  function stripEnglishBismillah(text){
    return String(text||"").replace(/^\s*(?:in the name of allah[^.]*\.?\s*)/i,"").trim();
  }
  function normalizeReaderPosition(){
    if(Number(state?.surah)===1 && Number(state?.ayah)<=1) state.ayah=2;
  }

  normalizeReaderPosition();

  const accountAwareSave=saveState;
  saveState=function(){
    normalizeReaderPosition();
    if(currentAyah){
      state.lastJuz=Number(currentAyah.juz)||Number(state.lastJuz)||1;
      state.globalAyah=Number(currentAyah.number)||Number(state.globalAyah)||1;
    }
    return accountAwareSave();
  };

  const basePopulateAyahSelect=populateAyahSelect;
  populateAyahSelect=function(total){
    basePopulateAyahSelect(total);
    if(Number(state.surah)===1){
      const first=els.ayahSelect?.querySelector('option[value="1"]');
      first?.remove();
      if(Number(state.ayah)<=1) state.ayah=2;
      if(els.ayahSelect) els.ayahSelect.value=String(state.ayah);
    }
  };

  const baseLoadSurah=loadSurah;
  loadSurah=async function(surahNumber,targetAyah=1,autoplayAfterLoad=false){
    const safeTarget=Number(surahNumber)===1&&Number(targetAyah)<=1?2:targetAyah;
    return baseLoadSurah(surahNumber,safeTarget,autoplayAfterLoad);
  };

  const baseRenderAyah=renderAyah;
  renderAyah=function(){
    if(Number(state.surah)===1&&Number(state.ayah)<=1){ state.ayah=2; }
    baseRenderAyah();
    const cleanArabic=stripLeadingBismillah(currentAyah?.text||"");
    const cleanEnglish=stripEnglishBismillah(currentTranslation?.text||"");
    if(els.bismillahText){els.bismillahText.textContent="";els.bismillahText.hidden=true;}
    if(els.arabicText) els.arabicText.textContent=cleanArabic;
    if(els.translationText) els.translationText.textContent=cleanEnglish||currentTranslation?.text||"";
    currentReward=countArabicLetters(cleanArabic)*10;
    if(els.gainPreview) els.gainPreview.textContent=formatNumber(currentReward);
    if(els.prevBtn) els.prevBtn.disabled=Number(state.surah)===1&&Number(state.ayah)<=2;
    state.lastJuz=Number(currentAyah?.juz)||1;
    state.globalAyah=Number(currentAyah?.number)||1;
    saveState();
  };

  const baseGoPrevious=goPrevious;
  goPrevious=async function(){
    if(Number(state.surah)===1&&Number(state.ayah)<=2) return;
    return baseGoPrevious();
  };

  const baseAudioCandidates=audioCandidatesForAyah;
  audioCandidatesForAyah=function(){
    if(Number(state.surah)===1&&Number(state.ayah)<=1) return [];
    return baseAudioCandidates();
  };

  /* ---------- Ayat al-Kursi previews for every reciter ---------- */
  let previewAudio=null, previewButton=null;
  function stopPreview(){
    if(previewAudio){try{previewAudio.pause();previewAudio.currentTime=0;}catch{} previewAudio=null;}
    if(previewButton){previewButton.dataset.state="idle";previewButton.setAttribute("aria-label","Preview Ayat al-Kursi");const label=$(".v58-preview-label",previewButton);if(label)label.textContent="Preview";const icon=$(".v58-preview-icon",previewButton);if(icon)icon.innerHTML=iconSvg("play");}
    previewButton=null;
  }
  function installReciterPreviews(){
    const setting=$("#reciterSetting");
    const select=$("#reciterSelect");
    if(!setting||!select||$(".v58-reciter-list",setting)) return;
    select.classList.add("v58-native-select");
    const list=document.createElement("div");
    list.className="v58-reciter-list";
    RECITERS.forEach(reciter=>{
      const row=document.createElement("div");
      row.className="v58-reciter-row";
      row.dataset.reciter=reciter.id;
      row.innerHTML=`<button class="v58-reciter-choice" type="button"><span class="v58-reciter-orb" aria-hidden="true">${iconSvg("wave")}</span><span><strong>${reciter.name}</strong><small>Ayat al-Kursi • 2:255</small></span><span class="v58-selected-mark" aria-hidden="true">${iconSvg("check")}</span></button><button class="v58-reciter-preview" type="button" aria-label="Preview Ayat al-Kursi"><span class="v58-preview-icon">${iconSvg("play")}</span><span class="v58-preview-label">Preview</span></button>`;
      $(".v58-reciter-choice",row).addEventListener("click",()=>{
        if(select.value!==reciter.id){select.value=reciter.id;select.dispatchEvent(new Event("change",{bubbles:true}));}
        updateReciterRows();
      });
      $(".v58-reciter-preview",row).addEventListener("click",async e=>{
        e.stopPropagation();
        const btn=e.currentTarget;
        if(previewButton===btn&&previewAudio&&!previewAudio.paused){stopPreview();return;}
        stopPreview();
        stopAudio(true);
        previewButton=btn;btn.dataset.state="loading";$(".v58-preview-label",btn).textContent="Loading";
        const audio=new Audio(`https://everyayah.com/data/${reciter.folder}/002255.mp3`);
        previewAudio=audio;audio.preload="auto";audio.playbackRate=requestedPlaybackRate();
        audio.addEventListener("playing",()=>{if(previewButton===btn){btn.dataset.state="playing";$(".v58-preview-label",btn).textContent="Playing";$(".v58-preview-icon",btn).innerHTML=iconSvg("pause");}});
        audio.addEventListener("ended",()=>{if(previewButton===btn){$(".v58-preview-icon",btn).innerHTML=iconSvg("play");stopPreview();}});
        audio.addEventListener("error",()=>{if(previewButton===btn){$(".v58-preview-icon",btn).innerHTML=iconSvg("play");stopPreview();showToast(`${reciter.name} preview is temporarily unavailable.`);}});
        try{await audio.play();}catch{stopPreview();showToast("Press Preview again if your browser blocked audio.");}
      });
      list.appendChild(row);
    });
    setting.appendChild(list);
    select.addEventListener("change",updateReciterRows);
    updateReciterRows();
  }
  function updateReciterRows(){
    $$(".v58-reciter-row").forEach(row=>row.classList.toggle("selected",row.dataset.reciter===state.settings.reciter));
  }

  /* ---------- SVG icon system ---------- */
  function iconSvg(name){
    const p={
      brand:'<path d="M5 7.5c2.2-1.5 4.5-1.6 7-.2v10.2c-2.5-1.4-4.8-1.3-7 .2V7.5Z"/><path d="M19 7.5c-2.2-1.5-4.5-1.6-7-.2v10.2c2.5-1.4 4.8-1.3 7 .2V7.5Z"/><path d="M12 7v11"/>',
      home:'<path d="m4 11 8-7 8 7"/><path d="M6.5 10.5V20h11v-9.5"/><path d="M9.5 20v-6h5v6"/>',
      settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.5 1a8 8 0 0 0-1.7-1L14.4 3h-4.8l-.3 3.1a8 8 0 0 0-1.7 1l-2.5-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.5-1a8 8 0 0 0 1.7 1l.3 3.1h4.8l.3-3.1a8 8 0 0 0 1.7-1l2.5 1 2-3.4-2-1.5c.1-.3.1-.7.1-1Z"/>',
      profile:'<circle cx="12" cy="8" r="4"/><path d="M4.5 21c.8-4.2 3.3-6.3 7.5-6.3s6.7 2.1 7.5 6.3"/>',
      sun:'<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      names:'<path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/>',
      heart:'<path d="M20.8 5.8c-1.8-2-5-2.2-7.1-.3L12 7l-1.7-1.5C8.2 3.6 5 3.8 3.2 5.8 1 8.2 1.3 12 3.7 14.2L12 22l8.3-7.8c2.4-2.2 2.7-6 .5-8.4Z"/>',
      ayah:'<rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 9h6v6H9z"/>',
      clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
      feedback:'<path d="M5 5h14v11H9l-4 3V5Z"/><path d="M8 9h8M8 12h5"/>',
      theme:'<path d="M12 3a9 9 0 1 0 9 9c0-1-.2-2-.5-2.8A7 7 0 0 1 12 3Z"/>',
      wave:'<path d="M4 13v-2M8 16V8M12 19V5M16 16V8M20 13v-2"/>',
      play:'<path d="m9 6 9 6-9 6V6Z"/>',
      pause:'<path d="M9 7v10M15 7v10"/>',
      check:'<path d="m6 12 4 4 8-9"/>',
      logout:'<path d="M10 4H5v16h5M14 8l4 4-4 4M9 12h9"/>',
      trash:'<path d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M7 7l1 14h8l1-14"/>'
    }[name]||'';
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${p}</svg>`;
  }
  function setIcon(el,name){if(!el)return;el.innerHTML=iconSvg(name);el.classList.add("v58-svg-icon");}
  function installIcons(){
    setIcon($(".brand-mark"),"brand");
    const stats=$$(".top-stats .stat-pill");
    setIcon(stats[0]?.querySelector(".gold-heart3d"),"heart");
    setIcon(stats[1]?.querySelector(".stat-icon"),"ayah");
    setIcon(stats[2]?.querySelector(".stat-icon"),"clock");
    const nav=$$(".bottom-nav-btn");
    [[0,"home"],[1,"settings"],[2,"profile"],[3,"sun"],[4,"names"]].forEach(([i,n])=>setIcon(nav[i]?.querySelector(".bottom-nav-icon"),n));
    setIcon($("#feedbackBtn .site-utility-icon"),"feedback");
    setIcon($("#quickThemeButton .site-utility-icon"),"theme");
    const support=$("#supportBtn .site-utility-icon");if(support)setIcon(support,"heart");
    const reset=$("#resetBtn");if(reset&&!$(".v58-action-icon",reset))reset.insertAdjacentHTML("afterbegin",`<span class="v58-action-icon">${iconSvg("trash")}</span>`);
    const out=$("#oq25SignOutBtn");if(out&&!$(".v58-action-icon",out))out.insertAdjacentHTML("afterbegin",`<span class="v58-action-icon">${iconSvg("logout")}</span>`);
  }

  /* ---------- Move the account status into the header instead of floating over content ---------- */
  function dockSyncStatus(){
    const chip=$("#guestUnsavedBubble");
    const topbar=$(".v5-topbar");
    const utilities=$(".site-utility-actions");
    if(!chip||!topbar||chip.dataset.v58Docked==="1") return;
    chip.dataset.v58Docked="1";
    chip.classList.add("v58-sync-chip");
    topbar.insertBefore(chip,utilities||$(".top-stats"));
  }

  /* ---------- Scroll-lock safety: only lock when a real overlay is open ---------- */
  function repairScrollLocks(){
    const drawerOpen=$("#settingsDrawer")?.classList.contains("open");
    const modalOpen=!!$(".utility-modal.open,.oq25-auth-modal.open,.share-sheet.open");
    if(!drawerOpen) document.body.classList.remove("drawer-open");
    if(!modalOpen) document.body.classList.remove("utility-modal-open");
  }
  const lockObserver=new MutationObserver(repairScrollLocks);
  lockObserver.observe(document.body,{attributes:true,attributeFilter:["class"],subtree:false});
  document.addEventListener("click",()=>setTimeout(repairScrollLocks,0),true);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")setTimeout(repairScrollLocks,0);});

  /* Keep reciter preview state synchronized with actual setting changes. */
  const basePopulateReciters=populateReciters;
  populateReciters=function(){basePopulateReciters();installReciterPreviews();updateReciterRows();};

  /* Initialize without blocking the UI. */
  function initV58(){
    installIcons();
    dockSyncStatus();
    installReciterPreviews();
    repairScrollLocks();
    normalizeReaderPosition();
    document.documentElement.classList.add("v58-ready");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initV58,{once:true});else initV58();

  window.OURQURAN_V58={stripLeadingBismillah,stopPreview,repairScrollLocks};
})();