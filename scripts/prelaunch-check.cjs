// Run from frontend: node --test scripts/prelaunch-check.cjs
// Native/Firebase adapters are mocked; these tests do not certify live services.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/') && name.endsWith('.json')) return require(path.join(root, name.slice(2)));
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts', mocks, globals);
    if (name.startsWith('.') && /\.(png|jpe?g|webp|gif|svg)$/i.test(name)) {
      const assetPath = path.resolve(path.dirname(path.join(root, file)), name);
      if (!fs.existsSync(assetPath)) throw new Error(`Missing local asset: ${assetPath}`);
      return assetPath;
    }
    if (name.startsWith('.') && name.endsWith('.json')) return require(path.resolve(path.dirname(path.join(root, file)), name));
    return require(name);
  }, console, setTimeout, clearTimeout, AbortController, ...globals }, { filename: file });
  return exports;
}
const dates = load('src/lib/dates.ts');
const account = load('src/lib/account.ts');
const surahs = load('src/data/surahs.ts');
const settle = () => new Promise(resolve => setImmediate(resolve));

test('dashboard periods and streak markers respect local days and week boundaries', () => {
  const dashboard = load('src/lib/dashboard.ts');
  const ref = new Date(2026, 8, 17, 12); // Thursday
  const history = {
    '2026-09-13': { hasanaat: 1000, ayat: 10, seconds: 300 }, // previous week
    '2026-09-14': { hasanaat: 100, ayat: 1, seconds: 60 },
    '2026-09-16': { hasanaat: 200, ayat: 2, seconds: 120 },
    '2026-09-17': { hasanaat: 300, ayat: 3, seconds: 180 },
  };
  const data = { history, totalHasanaat: 1600, completedReads: 16, totalSeconds: 660 };
  assert.equal(dashboard.dashboardDays(ref)[0].key, '2026-09-14');
  assert.equal(dashboard.dashboardStats(data, 'today', ref).seconds, 180);
  assert.equal(dashboard.dashboardStats(data, 'week', ref).hasanaat, 600);
  assert.equal(dashboard.dashboardStats(data, 'week', ref).ayat, 6);
  assert.equal(dashboard.dashboardStats(data, 'all', ref).days, 4);
  assert.equal(dashboard.dashboardStats(data, 'all', ref).hasanaat, 1600);
  assert.equal(dashboard.readingDayState(history, '2026-09-15', '2026-09-17'), 'missed');
  assert.equal(dashboard.readingDayState(history, '2026-09-16', '2026-09-17'), 'read');
  assert.equal(dashboard.readingDayState({ '2026-09-15': { hasanaat: 0, ayat: 0, seconds: 45 } }, '2026-09-15', '2026-09-17'), 'read');
  assert.equal(dashboard.readingDayState({}, '2026-09-17', '2026-09-17'), 'pending');
  assert.equal(dashboard.readingDayState({}, '2026-09-15', '2026-09-17'), 'missed');
  assert.equal(dashboard.readingDayState({}, '2026-09-18', '2026-09-17'), 'future');
  assert.equal(dates.computeStreak(history, ref), 2);
  assert.equal(dates.computeStreak({
    '2026-09-16': { hasanaat: 0, ayat: 0, seconds: 30 },
    '2026-09-17': { hasanaat: 0, ayat: 0, seconds: 45 },
  }, ref), 2);
  assert.equal(dashboard.dashboardStats(data, 'today', new Date(2026, 8, 18)).hasanaat, 0);
  assert.equal(dashboard.dashboardDays(new Date(2027, 0, 1))[0].key, '2026-12-28');
  assert.equal(dashboard.readingDuration(3660), '1h 1m');
  assert.equal(dashboard.readingDuration(0), '0s');
  assert.equal(dates.formatK(1200000), '1.2M');
});

test('bundled avatars survive profile sync, stale merges and guest import', () => {
  const { AVATARS, getAvatar } = load('src/lib/avatars.ts');
  assert.equal(AVATARS.length, 10);
  assert.equal(new Set(AVATARS.map(a => a.id)).size, 10);
  const base = account.fromRemote('A', { updatedAt: '2026-01-01T00:00:00Z' });
  for (const avatar of AVATARS) {
    const bytes = fs.readFileSync(path.join(root, 'assets/avatars', avatar.file));
    assert.equal(bytes.subarray(0, 2).toString('hex'), 'ffd8');
    assert.ok(avatar.source.startsWith('https://commons.wikimedia.org/'));
    assert.ok(avatar.license.startsWith('CC BY'));
    assert.ok(avatar.author.length > 0);
    assert.equal(getAvatar(avatar.id).id, avatar.id);
    const edited = account.fromRemote('A', { ...base, photoURL: avatar.id, profileUpdatedAt: '2026-01-02T00:00:00Z', profileFieldUpdatedAt: { ...base.profileFieldUpdatedAt, photoURL: '2026-01-02T00:00:00Z' } });
    const stale = { ...base, updatedAt: '2026-01-03T00:00:00Z' };
    assert.equal(account.mergeAccounts(edited, stale).photoURL, avatar.id);
    assert.equal(account.mergeAccounts(stale, edited).photoURL, avatar.id);
    assert.equal(account.absorbGuest(edited, account.defaultAccount()).photoURL, avatar.id);
  }
  assert.equal(getAvatar('https://old-upload.example/photo.jpg').id, AVATARS[0].id);
  assert.equal(getAvatar('ourquran-avatar:future-design').id, AVATARS[0].id);
});

test('device reward merge is additive, idempotent and isolates accounts', () => {
  const a = account.defaultAccount({ uid: 'A' });
  const phone = account.addProgress(a, 'phone', { hasanaat: 100, ayat: 1 });
  const tablet = account.addProgress(a, 'tablet', { hasanaat: 200, ayat: 2 });
  const merged = account.mergeAccounts(phone, tablet);
  assert.equal(merged.totalHasanaat, 300);
  assert.equal(merged.completedReads, 3);
  assert.equal(account.mergeAccounts(merged, phone).totalHasanaat, 300);
  assert.throws(() => account.mergeAccounts(merged, account.defaultAccount({ uid: 'B' })));
});
test('reading on a stale device cannot revert a custom goal or profile', () => {
  const base = account.fromRemote('A', { updatedAt: '2026-01-01T00:00:00Z', fullName: 'Old' });
  const edit = { ...base, fullName: 'New', profileUpdatedAt: '2026-01-02T00:00:00Z', profileFieldUpdatedAt: { ...base.profileFieldUpdatedAt, fullName: '2026-01-02T00:00:00Z' }, settings: { ...base.settings, dailyGoal: 137 }, settingsUpdatedAt: { ...base.settingsUpdatedAt, dailyGoal: '2026-01-02T00:00:00Z' } };
  const reading = { ...account.addProgress(base, 'phone', { hasanaat: 50, ayat: 1 }), updatedAt: '2026-01-03T00:00:00Z' };
  for (const result of [account.mergeAccounts(edit, reading), account.mergeAccounts(reading, edit)]) {
    assert.equal(result.settings.dailyGoal, 137);
    assert.equal(result.fullName, 'New');
    assert.equal(result.totalHasanaat, 50);
  }
});
test('avatar and username sync independently across stale devices', () => {
  const base = account.fromRemote('A', {
    username: 'reader',
    photoURL: 'ourquran-avatar:1',
    profileUpdatedAt: '2026-09-18T10:00:00Z',
  });
  const avatarEdit = {
    ...base,
    photoURL: 'ourquran-avatar:2',
    profileUpdatedAt: '2026-09-18T11:00:00Z',
    profileFieldUpdatedAt: { ...base.profileFieldUpdatedAt, photoURL: '2026-09-18T11:00:00Z' },
  };
  const usernameEdit = {
    ...base,
    username: 'reader_new',
    profileUpdatedAt: '2026-09-18T12:00:00Z',
    profileFieldUpdatedAt: { ...base.profileFieldUpdatedAt, username: '2026-09-18T12:00:00Z' },
  };
  for (const merged of [account.mergeAccounts(avatarEdit, usernameEdit), account.mergeAccounts(usernameEdit, avatarEdit)]) {
    assert.equal(merged.photoURL, 'ourquran-avatar:2');
    assert.equal(merged.username, 'reader_new');
  }
});

test('bookmark removal survives merge; a later re-add wins', () => {
  const a = account.defaultAccount({ uid: 'A', appState: { bookmarks: [{ surah: 2, ayah: 255, createdAt: '2026-01-01' }] } });
  const removed = { ...a, appState: { bookmarks: [], removedBookmarks: { '2:255': '2026-01-02' } } };
  assert.equal(account.mergeAccounts(a, removed).appState.bookmarks.length, 0);
  assert.equal(account.mergeAccounts(removed, a).appState.bookmarks.length, 0);
  const readd = { ...a, appState: { bookmarks: [{ surah: 2, ayah: 255, createdAt: '2026-01-03' }] } };
  assert.equal(account.mergeAccounts(removed, readd).appState.bookmarks.length, 1);
});
test('guest import preserves identity and does not duplicate rewards', () => {
  const a = account.defaultAccount({ uid: 'A', fullName: 'Ibrahim' });
  const guest = { ...account.addProgress(account.defaultAccount(), 'phone', { hasanaat: 80, ayat: 1 }), updatedAt: '2026-01-01T12:00:00Z' };
  const merged = account.absorbGuest(a, guest);
  assert.equal(merged.fullName, 'Ibrahim');
  assert.equal(account.absorbGuest(merged, guest).totalHasanaat, 80);
});

test('Google Play privacy and external deletion resources are configured', () => {
  const repoRoot = path.resolve(root, '..');
  const privacyPath = path.join(repoRoot, 'legal-site/privacy.html');
  const deletionPath = path.join(repoRoot, 'legal-site/delete-account.html');
  const deletionJsPath = path.join(repoRoot, 'legal-site/delete-account.js');
  const firebasePath = path.join(repoRoot, 'firebase.json');
  const firebasercPath = path.join(repoRoot, '.firebaserc');
  // OurQuranWeb is a standalone deployment repo. The mobile/legal hosting
  // bundle lives in the parent application repo and is validated there.
  if (!fs.existsSync(privacyPath)) return;
  for (const file of [privacyPath, deletionPath, deletionJsPath, firebasePath, firebasercPath]) {
    assert.ok(fs.existsSync(file), 'Missing legal/hosting resource: ' + file);
  }
  const privacy = fs.readFileSync(privacyPath, 'utf8');
  const deletion = fs.readFileSync(deletionPath, 'utf8');
  const deletionJs = fs.readFileSync(deletionJsPath, 'utf8');
  const about = fs.readFileSync(path.join(root, 'app/settings/about.tsx'), 'utf8');
  const firebase = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));
  const firebaserc = JSON.parse(fs.readFileSync(firebasercPath, 'utf8'));

  assert.match(privacy, /OurQuran/);
  assert.match(privacy, /Data retention and deletion/);
  assert.match(privacy, /\/delete-account/);
  assert.match(deletion, /Delete your OurQuran account/);
  assert.match(deletion, /Delete account permanently/);
  assert.match(deletionJs, /signInWithEmailAndPassword/);
  assert.match(deletionJs, /tx\.delete\(userRef\)/);
  assert.match(deletionJs, /deleteUser\(user\)/);
  assert.match(about, /https:\/\/ourquran\.web\.app\/privacy/);
  assert.match(about, /https:\/\/ourquran\.web\.app\/delete-account/);
  assert.equal(firebase.hosting.public, 'legal-site');
  assert.equal(firebaserc.projects.default, 'ourquran');
});

test('account deletion removes Firebase account data, username reservation and local cache', () => {
  const state = fs.readFileSync(path.join(root, 'src/context/AppState.tsx'), 'utf8');
  const accountScreen = fs.readFileSync(path.join(root, 'app/settings/account.tsx'), 'utf8');
  const start = state.indexOf('const deleteAccount = useCallback');
  const end = state.indexOf('const resetLocalData = useCallback', start);
  assert.ok(start >= 0 && end > start);
  const source = state.slice(start, end);
  assert.match(source, /reauthenticateWithCredential/);
  assert.match(source, /EmailAuthProvider\.credential/);
  assert.match(source, /tx\.delete\(doc\(db, "users", u\.uid\)\)/);
  assert.match(source, /doc\(db, "usernames", current\.username\)/);
  assert.match(source, /tx\.delete\(unameRef\)/);
  assert.match(source, /await deleteUser\(u\)/);
  assert.match(source, /storage\.removeItem\(accountKey\(u\.uid\)\)/);
  assert.match(accountScreen, /account-delete-account/);
  assert.match(accountScreen, /delete-account-password/);
  assert.match(accountScreen, /delete-account-confirm/);
  assert.match(accountScreen, /Delete forever/);
});

test('guest progress is session-only while preferences may stay local', () => {
  const state = fs.readFileSync(path.join(root, 'src/context/AppState.tsx'), 'utf8');
  const session = fs.readFileSync(path.join(root, 'src/context/SessionContext.tsx'), 'utf8');
  const start = state.indexOf('const signOut = useCallback');
  const end = state.indexOf('// ---------------------------------------------------------------------------\n  // Account API', start);
  assert.ok(start >= 0 && end > start);
  const signOutSource = state.slice(start, end);
  assert.match(state, /GUEST_PREFS_KEY/);
  assert.match(state, /guestCarryRef/);
  assert.match(signOutSource, /storage\.removeItem\(GUEST_KEY\)/);
  assert.match(signOutSource, /storage\.removeItem\("session_clock_v2_guest"\)/);
  assert.doesNotMatch(signOutSource, /accountWriter\.current\(GUEST_KEY/);
  assert.match(session, /const persistent = owner !== "guest"/);
  assert.match(session, /if \(!persistent\) return;/);
  assert.match(signOutSource, /fbSignOut\(auth\)/);
});
test('three-device account merge preserves exact rewards, goal, profile fields and bookmark tombstones', () => {
  const base = account.defaultAccount({ uid: 'A' });

  let phone = account.addProgress(base, 'phone', { hasanaat: 100, ayat: 1, seconds: 10 }, '2026-09-17');
  phone = account.addProgress(phone, 'phone', { hasanaat: 200, ayat: 2, seconds: 20 }, '2026-09-18');
  phone = {
    ...phone,
    photoURL: 'ourquran-avatar:2',
    profileUpdatedAt: '2026-09-18T11:00:00Z',
    profileFieldUpdatedAt: { ...phone.profileFieldUpdatedAt, photoURL: '2026-09-18T11:00:00Z' },
    appState: { bookmarks: [{ surah: 2, ayah: 255, createdAt: '2026-09-18T10:00:00Z' }] },
  };

  let tablet = account.addProgress(base, 'tablet', { hasanaat: 300, ayat: 3, seconds: 30 }, '2026-09-18');
  tablet = {
    ...tablet,
    username: 'reader_new',
    profileUpdatedAt: '2026-09-18T12:00:00Z',
    profileFieldUpdatedAt: { ...tablet.profileFieldUpdatedAt, username: '2026-09-18T12:00:00Z' },
    appState: { bookmarks: [], removedBookmarks: { '2:255': '2026-09-18T12:30:00Z' } },
  };

  let laptop = account.addProgress(base, 'laptop', { hasanaat: 400, ayat: 4, seconds: 40 }, '2026-09-19');
  laptop = {
    ...laptop,
    settings: { ...laptop.settings, dailyGoal: 137 },
    settingsUpdatedAt: { ...laptop.settingsUpdatedAt, dailyGoal: '2026-09-18T13:00:00Z' },
  };

  const orders = [
    account.mergeAccounts(account.mergeAccounts(phone, tablet), laptop),
    account.mergeAccounts(account.mergeAccounts(laptop, phone), tablet),
    account.mergeAccounts(account.mergeAccounts(tablet, laptop), phone),
  ];
  for (const merged of orders) {
    assert.equal(merged.totalHasanaat, 1000);
    assert.equal(merged.completedReads, 10);
    assert.equal(merged.totalSeconds, 100);
    assert.equal(merged.history['2026-09-18'].hasanaat, 500);
    assert.equal(merged.settings.dailyGoal, 137);
    assert.equal(merged.photoURL, 'ourquran-avatar:2');
    assert.equal(merged.username, 'reader_new');
    assert.equal(merged.appState.bookmarks.length, 0);
  }
});

test('reading time spanning midnight stays on the correct dates', () => {
  let a = account.defaultAccount({ uid: 'A' });
  a = account.addProgress(a, 'phone', { hasanaat: 0, ayat: 0, seconds: 20 }, '2026-09-16');
  a = account.addProgress(a, 'phone', { hasanaat: 0, ayat: 0, seconds: 10 }, '2026-09-17');
  assert.equal(a.totalSeconds, 30);
  assert.equal(a.history['2026-09-16'].seconds, 20);
  assert.equal(a.history['2026-09-17'].seconds, 10);
});
test('synced progress preserves local-calendar read/missed states across devices', () => {
  const dashboard = load('src/lib/dashboard.ts');
  let phone = account.defaultAccount({ uid: 'A' });
  phone = account.addProgress(phone, 'phone', { hasanaat: 0, ayat: 0, seconds: 90 }, '2026-09-14');
  let tablet = account.defaultAccount({ uid: 'A' });
  tablet = account.addProgress(tablet, 'tablet', { hasanaat: 100, ayat: 1, seconds: 15 }, '2026-09-16');
  const merged = account.mergeAccounts(phone, tablet);
  assert.equal(dashboard.readingDayState(merged.history, '2026-09-14', '2026-09-17'), 'read');
  assert.equal(dashboard.readingDayState(merged.history, '2026-09-15', '2026-09-17'), 'missed');
  assert.equal(dashboard.readingDayState(merged.history, '2026-09-16', '2026-09-17'), 'read');
  assert.equal(dashboard.readingDayState(merged.history, '2026-09-17', '2026-09-17'), 'pending');
  assert.equal(dashboard.readingDayState(merged.history, '2026-09-18', '2026-09-17'), 'future');
  assert.equal(dates.computeStreak(merged.history, new Date(2026, 8, 17, 23, 59)), 1);
});

test('daily-name cycle and all Quran audio addresses', () => {
  const names = load('src/data/names99.ts');
  assert.equal(new Set(Array.from({ length: 99 }, (_, i) => names.nameOfDay(1000 + i).number)).size, 99);
  assert.equal(dates.localDayNumber(new Date(2027, 0, 1)) - dates.localDayNumber(new Date(2026, 11, 31)), 1);
  const { RECITERS, everyAyahUrl } = load('src/data/reciters.ts');
  let count = 0;
  for (let s = 1; s <= 114; s++) for (let a = 1; a <= surahs.surahMeta(s).ayahs; a++) {
    count++;
    for (const r of RECITERS) assert.ok(everyAyahUrl(r.id, s, a).endsWith(`${String(s).padStart(3, '0')}${String(a).padStart(3, '0')}.mp3`));
  }
  assert.equal(count, 6236);
});
test('all 6,236 bundled Quran ayahs have matching Arabic and English entries', async () => {
  const q = load('src/lib/quran.ts');
  let count = 0;
  for (let s = 1; s <= 114; s++) {
    const data = await q.fetchSurah(s);
    assert.equal(data.number, s);
    assert.equal(data.ayahs.length, surahs.surahMeta(s).ayahs);
    for (let i = 0; i < data.ayahs.length; i++) {
      const ayah = data.ayahs[i];
      assert.equal(ayah.numberInSurah, i + 1);
      assert.ok(ayah.arabic.trim());
      assert.ok(ayah.english.trim());
      count++;
    }
  }
  assert.equal(count, 6236);
  await assert.rejects(q.fetchSurah(115), /Invalid/);
  assert.equal(q.stripLeadingBismillah('بسم الله الرحمن الرحيم الم', 2, 1), 'الم');
  assert.equal(q.stripLeadingBismillah('بسم الله الرحمن الرحيم', 1, 1), 'بسم الله الرحمن الرحيم');
});
test('surah-opening recitation removes redundant Bismillah without changing Quran numbering', () => {
  const reciters = load('src/data/reciters.ts');
  assert.equal(reciters.globalAyahNumber(1, 1), 1);
  assert.equal(reciters.globalAyahNumber(2, 1), 8);
  assert.equal(reciters.globalAyahNumber(30, 1), 3410);

  const baqarah = reciters.recitationUrl('alafasy', 2, 1);
  assert.equal(baqarah, 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/8.mp3');
  assert.doesNotMatch(baqarah, /alafasy-2/);
  assert.match(reciters.recitationUrl('ayyoub', 2, 1), /\/128\/ar\.muhammadayoub\/8\.mp3$/);
  assert.match(reciters.recitationUrl('sudais', 2, 1), /\/192\/ar\.sudais\/8\.mp3$/);
  assert.match(reciters.recitationUrl('minshawi', 2, 1), /\/128\/ar\.minshawi\/8\.mp3$/);

  // Fatiha 1:1 is an actual numbered ayah in the canonical 6,236-ayah data.
  assert.match(reciters.recitationUrl('alafasy', 1, 1), /Alafasy_128kbps\/001001\.mp3$/);
  // At-Tawbah has no opening Bismillah.
  assert.match(reciters.recitationUrl('alafasy', 9, 1), /Alafasy_128kbps\/009001\.mp3$/);
  // Ali Jaber keeps the verse file; EveryAyah exposes Bismillah separately as ayah 000.
  assert.match(reciters.recitationUrl('jaber', 2, 1), /Ali_Jaber_64kbps\/002001\.mp3$/);
  assert.doesNotMatch(reciters.recitationUrl('jaber', 2, 1), /002000\.mp3$/);

  // Non-opening ayahs stay on the original EveryAyah path.
  assert.match(reciters.recitationUrl('alafasy', 2, 2), /Alafasy_128kbps\/002002\.mp3$/);
  assert.equal(reciters.audioCacheVariant('alafasy', 2, 1), 'nobasmala-v2');
  assert.equal(reciters.audioCacheVariant('alafasy', 2, 2), 'standard');
});

test('reader playback preview and disk cache all use the no-Bismillah source contract', () => {
  const audio = fs.readFileSync(path.join(root, 'src/lib/audio.ts'), 'utf8');
  const cache = fs.readFileSync(path.join(root, 'src/lib/audio-cache.ts'), 'utf8');
  const quick = fs.readFileSync(path.join(root, 'src/components/ReaderQuickSettings.tsx'), 'utf8');
  assert.match(audio, /recitationUrl\(reciterId, surah, ayah\)/);
  assert.doesNotMatch(audio, /everyAyahUrl\(reciterId, surah, ayah\)/);
  assert.match(cache, /audioCacheVariant/);
  assert.match(cache, /recitationUrl\(target\.reciterId, target\.surah, target\.ayah\)/);
  assert.match(quick, /recitationUrl\(reciterId, RECITER_PREVIEW_SURAH, RECITER_PREVIEW_AYAH\)/);
  assert.doesNotMatch(quick, /everyAyahUrl\(reciterId/);
});

test('audio reuses one native player across ayahs and exit still releases it', async () => {
  const players = []; let modes = 0;
  const native = { createAudioPlayer: () => {
    const p = {
      play() { this.played = (this.played ?? 0) + 1; },
      pause() { this.paused = (this.paused ?? 0) + 1; },
      remove() { this.removed = true; },
      replace(source) { this.source = source; },
      setPlaybackRate() {},
      addListener(_, fn) { this.emit = fn; return { remove() {} }; },
    };
    players.push(p); return p;
  }, preload: async () => {}, clearPreloadedSource: async () => {}, setAudioModeAsync: async () => { modes++; }, setIsAudioActiveAsync: async () => {} };
  const audio = load('src/lib/audio.ts', {
    'expo-audio': native,
    '@/src/lib/audio-cache': {
      getCachedAyahUri: async () => null,
      queueAyahAudio: async () => null,
      warmAudioNeighborhood() {},
      warmVisibleAyahs() {},
    },
    react: { useCallback: f => f, useEffect() {}, useSyncExternalStore: (_, get) => get() },
  });
  const hook = () => audio.useAyahAudio({ reciterId: 'alafasy', speed: 1 });

  hook().playAyah(2, 1); assert.equal(hook().isLoading, true); await settle();
  players[0].emit({ isLoaded: true, playing: false }); await settle();
  assert.equal(players[0].played, 1);

  players[0].emit({ isLoaded: true, playing: false, didJustFinish: true }); await settle();
  assert.equal(players.length, 1);
  assert.equal(players[0].removed, undefined);

  hook().playAyah(2, 2); await settle();
  assert.equal(players.length, 1);
  players[0].emit({ isLoaded: true, playing: false }); await settle();
  assert.equal(players[0].played, 2);

  audio.stopAllAyahAudio(); await settle();
  assert.equal(players[0].removed, true);

  hook().playAyah(2, 3); await settle();
  assert.equal(players.length, 2);
  players[1].emit({ isLoaded: true, playing: false }); await settle();
  audio.stopAllAyahAudio();
  assert.equal(players[1].removed, true);
  assert.equal(modes, 1);
});

test('reader play-pause resumes the same loaded ayah instead of restarting it', async () => {
  const players = [];
  const native = {
    createAudioPlayer: () => {
      const p = {
        play() { this.played = (this.played ?? 0) + 1; },
        pause() { this.paused = (this.paused ?? 0) + 1; },
        remove() {},
        replace(source) { this.source = source; this.replaced = (this.replaced ?? 0) + 1; },
        setPlaybackRate() {},
        addListener(_, fn) { this.emit = fn; return { remove() {} }; },
      };
      players.push(p);
      return p;
    },
    preload: async () => {},
    clearPreloadedSource: async () => {},
    setAudioModeAsync: async () => {},
    setIsAudioActiveAsync: async () => {},
  };
  const audio = load('src/lib/audio.ts', {
    'expo-audio': native,
    '@/src/lib/audio-cache': {
      getCachedAyahUri: async () => null,
      queueAyahAudio: async () => null,
      warmAudioNeighborhood() {},
      warmVisibleAyahs() {},
    },
    react: { useCallback: f => f, useEffect() {}, useSyncExternalStore: (_, get) => get() },
  });
  const hook = () => audio.useAyahAudio({ reciterId: 'alafasy', speed: 1 });

  hook().toggle(2, 255);
  await settle();
  players[0].emit({ isLoaded: true, playing: false });
  await settle();
  assert.equal(players[0].played, 1);
  assert.equal(players[0].replaced, 1);

  hook().toggle(2, 255);
  assert.equal(players[0].paused, 2); // one pre-replace pause + actual user pause
  hook().toggle(2, 255);
  assert.equal(players[0].played, 2);
  assert.equal(players[0].replaced, 1);
  assert.equal(players.length, 1);

  audio.stopAllAyahAudio();
});

test('reader quick settings stay in-reader and expose every recitation control', () => {
  const reader = fs.readFileSync(path.join(root, 'app/reader.tsx'), 'utf8');
  const header = fs.readFileSync(path.join(root, 'src/components/ReaderHeader.tsx'), 'utf8');
  const quick = fs.readFileSync(path.join(root, 'src/components/ReaderQuickSettings.tsx'), 'utf8');
  const state = fs.readFileSync(path.join(root, 'src/context/AppState.tsx'), 'utf8');
  assert.match(header, /name="tune-variant"/);
  assert.match(header, /reader-quick-settings-open/);
  assert.match(reader, /<ReaderQuickSettings/);
  assert.match(reader, /onBeforeReciterChange=\{audio\.stop\}/);
  assert.doesNotMatch(quick, /useRouter|router\.push|router\.replace/);
  const reciterData = load('src/data/reciters.ts');
  for (const reciter of ['alafasy', 'ayyoub', 'sudais', 'jaber', 'minshawi']) {
    assert.ok(reciterData.RECITERS.some(r => r.id === reciter));
  }
  assert.equal(reciterData.RECITER_PREVIEW_SURAH, 2);
  assert.equal(reciterData.RECITER_PREVIEW_AYAH, 255);
  assert.match(quick, /reader-quick-settings-scroll/);
  assert.match(quick, /reader-quick-preview-/);
  assert.match(quick, /getCachedAyahUri/);
  assert.match(quick, /RECITER_PREVIEW_SURAH/);
  assert.match(quick, /RECITER_PREVIEW_AYAH/);
  assert.match(quick, /<RecitationSpeedControl/);
  assert.match(quick, /playerRef\.current\?\.setPlaybackRate\(draftSpeed, "high"\)/);
  assert.match(quick, /player\.setPlaybackRate\(speedRef\.current, "high"\)/);
  assert.match(quick, /reader-quick-settings-drag-zone/);
  assert.match(quick, /Gesture\.Pan\(\)/);
  assert.match(quick, /velocityY > 520/);
  assert.match(quick, /GestureHandlerRootView/);
  assert.match(quick, /ScrollView as GestureScrollView/);
  assert.doesNotMatch(quick, /reader-quick-settings-close/);
  assert.match(quick, /reader-quick-theme-grid/);
  assert.match(quick, /READER_THEMES\.map/);
  assert.match(quick, /updateSettings\(\{ readerTheme \}\)/);
  assert.match(quick, /reader-quick-autoplay-switch/);
  assert.match(state, /"updateSettings"/);
});

test('reader and Settings share one UI-thread seven-step speed control', () => {
  const quick = fs.readFileSync(path.join(root, 'src/components/ReaderQuickSettings.tsx'), 'utf8');
  const settingsScreen = fs.readFileSync(path.join(root, 'app/settings/reader.tsx'), 'utf8');
  const shared = fs.readFileSync(path.join(root, 'src/components/RecitationSpeedControl.tsx'), 'utf8');
  assert.match(shared, /RECITATION_SPEEDS = \[0\.5, 0\.75, 1, 1\.25, 1\.5, 1\.75, 2\]/);
  assert.match(shared, /Gesture\.Pan\(\)/);
  assert.match(shared, /useSharedValue/);
  assert.match(shared, /withTiming/);
  assert.match(shared, /minDistance\(0\)/);
  assert.match(shared, /runOnJS\(commitIndex\)/);
  assert.doesNotMatch(shared, /Drag or tap a marker|0\.25× increments/);
  const updateStart = shared.indexOf('.onUpdate');
  const updateEnd = shared.indexOf('.onEnd', updateStart);
  assert.ok(updateStart >= 0 && updateEnd > updateStart);
  assert.doesNotMatch(shared.slice(updateStart, updateEnd), /onChange\(/);
  assert.doesNotMatch(shared.slice(updateStart, updateEnd), /runOnJS/);
  assert.match(quick, /<RecitationSpeedControl/);
  assert.match(settingsScreen, /<RecitationSpeedControl/);
  assert.doesNotMatch(quick, /function DiscreteSpeedSlider/);
  assert.doesNotMatch(settingsScreen, /SPEEDS\.map/);
  for (const speed of [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]) {
    const restored = account.fromRemote('A', { settings: { speed } });
    assert.equal(restored.settings.speed, speed);
  }
});

test('all reciter previews use Ayat al-Kursi and never a surah-opening intro', () => {
  const quick = fs.readFileSync(path.join(root, 'src/components/ReaderQuickSettings.tsx'), 'utf8');
  const settingsScreen = fs.readFileSync(path.join(root, 'app/settings/reader.tsx'), 'utf8');
  const reciterData = load('src/data/reciters.ts');
  assert.equal(reciterData.RECITER_PREVIEW_SURAH, 2);
  assert.equal(reciterData.RECITER_PREVIEW_AYAH, 255);
  for (const source of [quick, settingsScreen]) {
    assert.match(source, /RECITER_PREVIEW_SURAH/);
    assert.match(source, /RECITER_PREVIEW_AYAH/);
    assert.doesNotMatch(source, /recitationUrl\(reciterId,\s*1,\s*1\)/);
  }
});

test('reader audio controls apply live and stay isolated by reciter', () => {
  const audio = fs.readFileSync(path.join(root, 'src/lib/audio.ts'), 'utf8');
  const cache = fs.readFileSync(path.join(root, 'src/lib/audio-cache.ts'), 'utf8');
  assert.match(audio, /activePlaybackRate = speed/);
  assert.match(audio, /setPlaybackRate\(activePlaybackRate, "high"\)/);
  assert.match(audio, /\[speed\]/);
  assert.match(cache, /reciterId/);
  assert.match(cache, /keyOf/);
  assert.match(cache, /reciterId.*surah.*ayah|reciterId.*String\(surah\)/s);
});

test('setting no-ops do not create avoidable account renders or sync writes', () => {
  const source = fs.readFileSync(path.join(root, 'src/context/AppState.tsx'), 'utf8');
  assert.match(source, /if \(!changedKeys\.length\) return a/);
  assert.match(source, /if \(updated === prev\) return/);
});

test('newer synced recitation preferences win without touching reading progress', () => {
  const older = account.fromRemote('A', {
    settings: { reciter: 'alafasy', speed: 1, autoplay: false },
    settingsUpdatedAt: { reciter: '2026-09-18T10:00:00Z', speed: '2026-09-18T10:00:00Z', autoplay: '2026-09-18T10:00:00Z' },
  });
  const newer = account.fromRemote('A', {
    settings: { reciter: 'minshawi', speed: 1.25, autoplay: true },
    settingsUpdatedAt: { reciter: '2026-09-18T11:00:00Z', speed: '2026-09-18T11:00:00Z', autoplay: '2026-09-18T11:00:00Z' },
  });
  const merged = account.mergeAccounts(older, newer);
  assert.equal(merged.settings.reciter, 'minshawi');
  assert.equal(merged.settings.speed, 1.25);
  assert.equal(merged.settings.autoplay, true);
  assert.equal(merged.totalHasanaat, 0);
});

test('settings normalization rejects unsupported reciters and playback speeds', () => {
  const invalid = account.fromRemote('A', { settings: { reciter: 'not-a-reciter', speed: 9, autoplay: true } });
  assert.equal(invalid.settings.reciter, 'alafasy');
  assert.equal(invalid.settings.speed, 1);
  assert.equal(invalid.settings.autoplay, true);
  const valid = account.fromRemote('A', { settings: { reciter: 'minshawi', speed: 1.25, autoplay: false } });
  assert.equal(valid.settings.reciter, 'minshawi');
  assert.equal(valid.settings.speed, 1.25);
});

test('all static internal navigation targets resolve to an app route', () => {
  const appDir = path.join(root, 'app');
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && /\.tsx$/.test(entry.name)) files.push(full);
    }
  }
  walk(appDir);

  const routes = new Set(['/']);
  for (const file of files) {
    let rel = path.relative(appDir, file).replace(/\\/g, '/').replace(/\.tsx$/, '');
    const segments = rel.split('/').filter(Boolean).filter(segment => !/^\(.+\)$/.test(segment));
    if (segments.at(-1) === '_layout') continue;
    if (segments.at(-1) === 'index') segments.pop();
    routes.add('/' + segments.join('/'));
  }
  routes.add('/(tabs)');

  const refs = [];
  for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    for (const match of code.matchAll(/router\.(?:push|replace)\(\s*["']([^"']+)["']/g)) refs.push([file, match[1]]);
    for (const match of code.matchAll(/pathname:\s*["']([^"']+)["']/g)) refs.push([file, match[1]]);
    for (const match of code.matchAll(/<Redirect\s+href=["']([^"']+)["']/g)) refs.push([file, match[1]]);
  }

  for (const [file, target] of refs) {
    if (/^https?:/.test(target)) continue;
    assert.ok(routes.has(target), `Missing app route for "${target}" referenced by ${path.relative(root, file)}`);
  }
});

test('critical navigation destinations exist before launch', () => {
  const routes = [
    'app/reader.tsx',
    'app/(tabs)/index.tsx',
    'app/(tabs)/read.tsx',
    'app/(tabs)/adhkar.tsx',
    'app/(tabs)/names.tsx',
    'app/(tabs)/preferences.tsx',
    'app/settings/reader-theme.tsx',
    'app/settings/bookmarks.tsx',
    'app/settings/reciter.tsx',
    'app/settings/speed.tsx',
    'app/settings/autoplay.tsx',
    'app/settings/goal.tsx',
    'app/settings/notifications.tsx',
    'app/settings/sync.tsx',
    'app/settings/profile.tsx',
  ];
  for (const route of routes) assert.ok(fs.existsSync(path.join(root, route)), 'Missing route: ' + route);
});

test("Reader exit always reaches Home and browser back cleanup avoids stale route writes", () => {
  const reader = fs.readFileSync(path.join(root, 'app/reader.tsx'), 'utf8');
  const start = reader.indexOf('const finishReaderAndGoHome = useCallback');
  const end = reader.indexOf('const imDone = useCallback', start);
  assert.ok(start >= 0 && end > start);
  const exit = reader.slice(start, end);
  assert.match(exit, /stopSession\(\)/);
  assert.match(exit, /exitReaderAudio\(\)/);
  assert.match(exit, /router\.replace\("\/"\)/);
  assert.ok(exit.indexOf('router.replace("/")') < exit.indexOf('addReadingSeconds(seconds, day)'));
  assert.match(reader, /window\.addEventListener\("popstate", handleBrowserBack\)/);
  assert.match(reader, /onBack=\{\(\) => finishReaderAndGoHome\(true\)\}/);
  assert.match(reader, /onPress=\{imDone\}/);
  assert.ok((reader.match(/runAfterPaint\(\(\) => \{\n\s*if \(exitingRef\.current\) return;/g) ?? []).length >= 4);
  const sessionStart = reader.indexOf('useFocusEffect(useCallback(() => {');
  const sessionEnd = reader.indexOf('// Quran text is bundled', sessionStart);
  assert.ok(sessionStart >= 0 && sessionEnd > sessionStart);
  assert.doesNotMatch(reader.slice(sessionStart, sessionEnd), /runAfterPaint\(\(\) => persistDeltas/);
});

test('route error recovery never remounts the global provider tree during normal navigation', () => {
  const layout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
  const boundary = fs.readFileSync(path.join(root, 'src/components/error-boundary.tsx'), 'utf8');
  assert.match(layout, /<ErrorBoundary resetKey=\{pathname\}>/);
  assert.doesNotMatch(layout, /<ErrorBoundary key=\{pathname\}>/);
  assert.match(boundary, /componentDidUpdate\(prevProps: ErrorBoundaryProps\)/);
  assert.match(boundary, /prevProps\.resetKey !== this\.props\.resetKey/);
});

test('subpage back buttons use actual navigation history with a safe Home fallback', () => {
  const header = fs.readFileSync(path.join(root, 'src/components/SubHeader.tsx'), 'utf8');
  assert.match(header, /router\.canGoBack\(\)/);
  assert.match(header, /router\.back\(\)/);
  assert.match(header, /router\.replace\("\/"\)/);
  assert.doesNotMatch(header, /pathname\.startsWith\("\/settings\/"\)/);
});

test('custom detail and shared-header back buttons preserve actual history', () => {
  const detail = fs.readFileSync(path.join(root, 'app/name/[id].tsx'), 'utf8');
  const appHeader = fs.readFileSync(path.join(root, 'src/components/AppHeader.tsx'), 'utf8');
  for (const source of [detail, appHeader]) {
    assert.match(source, /router\.canGoBack\(\)/);
    assert.match(source, /router\.back\(\)/);
  }
  assert.match(detail, /router\.replace\("\/names"\)/);
  assert.match(appHeader, /router\.replace\("\/"\)/);
});

test('desktop sidebar exposes privacy deletion account actions and a Tasbeeh Adhkar mark', () => {
  const tabs = fs.readFileSync(path.join(root, 'app/(tabs)/_layout.tsx'), 'utf8');
  assert.match(tabs, /ourquran\.web\.app\/privacy/);
  assert.match(tabs, /ourquran\.web\.app\/delete-account/);
  assert.match(tabs, /label="Privacy"/);
  assert.match(tabs, /label="Delete"/);
  assert.match(tabs, /<TasbeehIcon/);
  assert.match(tabs, /router\.push\(meta\.href\)/);
});

test('dashboard quick access complements rather than duplicates primary sidebar destinations', () => {
  const home = fs.readFileSync(path.join(root, 'app/(tabs)/index.tsx'), 'utf8');
  assert.match(home, /label:\s*"Bookmarks"/);
  assert.match(home, /label:\s*"Daily Goal"/);
  assert.match(home, /label:\s*"Reciter"/);
  assert.match(home, /label:\s*"Progress"/);
  assert.doesNotMatch(home, /<QuickAction[^>]+label="Read Quran"/);
  assert.doesNotMatch(home, /<QuickAction[^>]+label="Adhkar"/);
  assert.doesNotMatch(home, /<QuickAction[^>]+label="99 Names"/);
});

test('every statically referenced web icon has a real SVG mapping', () => {
  const iconSource = fs.readFileSync(path.join(root, 'src/components/Icon.web.tsx'), 'utf8');
  const aliasesBlock = iconSource.match(/const aliases:[\s\S]*?=\s*\{([\s\S]*?)\n\};/)?.[1] ?? '';
  const nodesBlock = iconSource.match(/const nodes:[\s\S]*?=\s*\{([\s\S]*?)\n\};/)?.[1] ?? '';
  const supported = new Set();
  for (const match of aliasesBlock.matchAll(/["']([^"']+)["']\s*:/g)) supported.add(match[1]);
  for (const match of nodesBlock.matchAll(/^\s*([A-Za-z][A-Za-z0-9_]*)\s*:/gm)) supported.add(match[1]);

  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && /\.tsx$/.test(entry.name)) checkFile(full);
    }
  }

  function collectIconChoices(node, out) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      out.add(node.text);
      return;
    }
    if (ts.isConditionalExpression(node)) {
      collectIconChoices(node.whenTrue, out);
      collectIconChoices(node.whenFalse, out);
      return;
    }
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      collectIconChoices(node.expression, out);
    }
  }

  function checkFile(file) {
    const code = fs.readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const names = new Set();
    for (const match of code.matchAll(/\bicon:\s*["']([^"']+)["']/g)) names.add(match[1]);
    function walk(node) {
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(ast) === 'Icon') {
        const attr = node.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(ast) === 'name');
        if (attr?.initializer) {
          if (ts.isStringLiteral(attr.initializer)) names.add(attr.initializer.text);
          else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) collectIconChoices(attr.initializer.expression, names);
        }
      }
      ts.forEachChild(node, walk);
    }
    walk(ast);
    for (const name of names) assert.ok(supported.has(name), `Missing web icon mapping for "${name}" referenced by ${path.relative(root, file)}`);
  }

  visit(path.join(root, 'app'));
  visit(path.join(root, 'src/components'));

  assert.doesNotMatch(iconSource, /M9 12h6M12 9v6/);
});

test('web icon set renders pause bookmark close and account glyphs instead of fallback plus', () => {
  const icons = fs.readFileSync(path.join(root, 'src/components/Icon.web.tsx'), 'utf8');
  assert.match(icons, /"pause": "pause"/);
  assert.match(icons, /"bookmark-outline": "bookmark"/);
  assert.match(icons, /"bookmark-multiple-outline": "bookmarks"/);
  assert.match(icons, /"account-circle-outline": "account"/);
  assert.match(icons, /close:\s*\[/);
  assert.match(icons, /pause:\s*\[/);
});

test('reader Quran text path is synchronous, fully offline and ships every bundle', () => {
  const quranSource = fs.readFileSync(path.join(root, 'src/lib/quran.ts'), 'utf8');
  const readerSource = fs.readFileSync(path.join(root, 'app/reader.tsx'), 'utf8');
  assert.doesNotMatch(quranSource, /api\.alquran\.cloud|\bfetch\s*\(/);
  assert.doesNotMatch(readerSource, /useQuery\s*\(/);
  assert.match(readerSource, /getBundledSurah/);
  const files = fs.readdirSync(path.join(root, 'src/data/quran-offline')).filter(name => name.endsWith('.json')).sort();
  assert.equal(files.length, 12);
  let count = 0;
  for (const file of files) {
    const rows = JSON.parse(fs.readFileSync(path.join(root, 'src/data/quran-offline', file), 'utf8'));
    for (const surah of rows) count += surah.ayahs.length;
  }
  assert.equal(count, 6236);
});

test('bottom tabs stay mounted, switch without animation and load icon font before splash', () => {
  const tabs = fs.readFileSync(path.join(root, 'app/(tabs)/_layout.tsx'), 'utf8');
  const rootLayout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
  assert.match(tabs, /detachInactiveScreens=\{false\}/);
  assert.match(tabs, /freezeOnBlur:\s*true/);
  assert.match(tabs, /lazy:\s*false/);
  assert.match(tabs, /animation:\s*"none"/);
  assert.doesNotMatch(tabs, /Animated\./);
  assert.match(tabs, /<Icon name=\{meta\.icon\} size=\{29\}/);
  assert.match(tabs, /width:\s*128/);
  assert.match(tabs, /<BrandLockup/);
  assert.match(rootLayout, /"Material Design Icons":\s*require\("@react-native-vector-icons\/material-design-icons\/fonts\/MaterialDesignIcons\.ttf"\)/);
});

test('web desktop shell uses premium top navigation, wide dashboard and cinematic Reader workspace', () => {
  const tabs = fs.readFileSync(path.join(root, 'app/(tabs)/_layout.tsx'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'app/(tabs)/index.tsx'), 'utf8');
  const reader = fs.readFileSync(path.join(root, 'app/reader.tsx'), 'utf8');
  const desktop = fs.readFileSync(path.join(root, 'src/components/DesktopReaderExperience.tsx'), 'utf8');
  const brand = fs.readFileSync(path.join(root, 'src/components/BrandMark.tsx'), 'utf8');
  assert.match(tabs, /<WebTopNav/);
  assert.match(home, /maxWidth:\s*1580/);
  assert.match(home, /Quick access/);
  assert.match(home, /Weekly journey/);
  assert.match(reader, /<DesktopReaderExperience/);
  assert.match(reader, /desktopReader/);
  assert.match(desktop, /backdropFilter/);
  assert.match(desktop, /reader-desktop-reciter-menu/);
  assert.match(desktop, /reader-desktop-speed-menu/);
  assert.match(desktop, /reader-desktop-autoplay-menu/);
  assert.match(desktop, /reader-desktop-previous/);
  assert.match(desktop, /reader-desktop-im-done/);
  assert.match(desktop, /reader-desktop-next/);
  assert.match(desktop, /updateSettings\(\{ reciter: item\.id \}\)/);
  assert.match(desktop, /updateSettings\(\{ speed \}\)/);
  assert.match(desktop, /updateSettings\(\{ autoplay: true \}\)/);
  assert.match(desktop, /updateSettings\(\{ autoplay: false \}\)/);
  assert.match(brand, /BRAND_MARK_URI/);
  assert.match(brand, /tone\?:\s*"white"\s*\|\s*"gold"/);
});

test('web favicon uses the current OurQuran brand mark and a valid export fallback', () => {
  const config = fs.readFileSync(path.join(root, 'app.json'), 'utf8');
  const layout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
  const brand = fs.readFileSync(path.join(root, 'src/components/BrandMark.tsx'), 'utf8');
  assert.match(config, /favicon-web-v3\.png/);
  assert.doesNotMatch(config, /"favicon": "\.\/assets\/images\/icon\.png"/);
  assert.match(layout, /BRAND_FAVICON_URI/);
  assert.match(layout, /rel="icon"/);
  assert.match(brand, /export const BRAND_FAVICON_URI/);
  assert.match(brand, /BRAND_MARK_URI/);
});

test('top streak badge avoids duplicate red-green week state and links progress metrics', () => {
  const home = fs.readFileSync(path.join(root, 'app/(tabs)/index.tsx'), 'utf8');
  const badge = fs.readFileSync(path.join(root, 'src/components/StreakBadge.tsx'), 'utf8');
  assert.match(home, /<StreakBadge/);
  assert.match(home, /router\.push\("\/settings\/progress"\)/);
  assert.match(home, /useFocusEffect/);
  assert.match(home, /consumePendingCrownCelebration/);
  assert.match(home, /home-week-strip/);
  assert.match(home, /readingDayState\(account\.history/);
  assert.doesNotMatch(badge, /weekStates|readingDayState|streakStep|missed|#FF8297|#B8324D/);
  assert.match(badge, /name="fire"/);
  assert.match(badge, /name="crown"/);
  assert.doesNotMatch(badge, />\s*STREAK\s*</);
  assert.doesNotMatch(badge, />\s*PROGRESS\s*</);
  assert.doesNotMatch(badge, /#6F43B5|#7148B5|#9B74E0|#6C43B0/);
  assert.match(badge, /borderWidth: 2/);
  assert.match(badge, /streak-progress-button/);
  assert.match(badge, /chart-box-outline/);
  assert.match(home, /week-crown-/);
  assert.match(home, /greetingName/);
  assert.match(home, /salamLine/);
});

test('three-day crown unlocks once, survives while the streak is active, and clears after a missed day', async () => {
  const memory = new Map();
  const storageMock = {
    async getItem(key, fallback) { return memory.has(key) ? memory.get(key) : fallback; },
    async setItem(key, value) { memory.set(key, value); return true; },
    async removeItem(key) { memory.delete(key); return true; },
  };
  const crown = load('src/lib/streak-crown.ts', {
    'expo-audio': {},
    'expo-file-system/legacy': {},
    'expo-haptics': {},
    '@/src/utils/storage': { storage: storageMock },
  });
  const ref = new Date(2026, 8, 17, 12);
  const before = {
    '2026-09-15': { hasanaat: 0, ayat: 0, seconds: 30 },
    '2026-09-16': { hasanaat: 0, ayat: 0, seconds: 30 },
  };
  const after = { ...before, '2026-09-17': { hasanaat: 0, ayat: 0, seconds: 30 } };
  assert.equal(crown.CROWN_STREAK_DAYS, 3);
  assert.equal(dates.computeStreak(before, ref), 2);
  assert.equal(dates.computeStreak(after, ref), 3);
  assert.equal(crown.shouldCelebrateCrown(2, 3), true);
  assert.equal(crown.shouldCelebrateCrown(3, 4), false);
  assert.equal(crown.crownActiveForStreak(3), true);
  assert.equal(crown.crownActiveForStreak(2), false);
  assert.equal(crown.queueCrownCelebrationIfEarned(before, after, 'user-a', ref), true);
  await settle();
  assert.equal(await crown.consumePendingCrownCelebration(3, '2026-09-17', 'user-b'), false);
  assert.equal(await crown.consumePendingCrownCelebration(3, '2026-09-17', 'user-a'), true);
  assert.equal(await crown.consumePendingCrownCelebration(3, '2026-09-17', 'user-a'), false);

  const stillAliveNextMorning = new Date(2026, 8, 18, 12);
  assert.equal(dates.computeStreak(after, stillAliveNextMorning), 3);
  assert.equal(crown.crownActiveForStreak(dates.computeStreak(after, stillAliveNextMorning)), true);

  const missedRef = new Date(2026, 8, 19, 12);
  assert.equal(dates.computeStreak(after, missedRef), 0);
  assert.equal(crown.crownActiveForStreak(dates.computeStreak(after, missedRef)), false);

  const crownSource = fs.readFileSync(path.join(root, 'src/lib/streak-crown.ts'), 'utf8');
  assert.match(crownSource, /makeTriumphWav/);
  assert.match(crownSource, /pendingCrownMemory/);
  assert.match(crownSource, /pendingKey\(normalizedScope\)/);
  assert.match(crownSource, /notificationAsync/);
  assert.match(crownSource, /createAudioPlayer/);
  assert.match(crownSource, /FileSystem\.EncodingType\.Base64/);
});

test('manual and foreground sync never report success after a failed or superseded push', () => {
  const source = fs.readFileSync(path.join(root, 'src/context/AppState.tsx'), 'utf8');
  const syncScreen = fs.readFileSync(path.join(root, 'app/settings/sync.tsx'), 'utf8');
  assert.match(source, /return !pendingSync\.current/);
  assert.match(source, /if \(!pushed && pendingSync\.current\) return false/);
  assert.match(source, /const syncNow = useCallback/);
  assert.match(syncScreen, /await syncNow\(\)/);
  assert.doesNotMatch(syncScreen, /await flush\(\)/);
});

test('account sync avoids Firestore Listen streams and refreshes only while active', () => {
  const source = fs.readFileSync(path.join(root, 'src/context/AppState.tsx'), 'utf8');
  assert.doesNotMatch(source, /\bonSnapshot\b|\bgetDoc\b/);
  assert.match(source, /AppState\.currentState === "active"/);
  assert.match(source, /15000/);
});

test('home primary actions use the new compact web-native visual language', () => {
  const home = fs.readFileSync(path.join(root, 'app/(tabs)/index.tsx'), 'utf8');
  assert.match(home, /continue-reading-card/);
  assert.match(home, /Read now/);
  assert.match(home, /dashboard-period-/);
  assert.match(home, /Quick access/);
  assert.match(home, /Weekly journey/);
  assert.match(home, /maxWidth:\s*1580/);
  assert.match(home, /<BrandMark size=\{248\}/);
  assert.match(home, /tone="gold"/);
  assert.match(home, /heroTopEdge/);
  assert.match(home, /heroRightBlend/);
});

test('reminder replacements serialize; disable cancels; denied permission rejects', async () => {
  const scheduled = new Map(); let granted = true;
  const notifications = {
    AndroidImportance: { DEFAULT: 3 }, SchedulableTriggerInputTypes: { DAILY: 'daily' },
    cancelScheduledNotificationAsync: async id => scheduled.delete(id),
    setNotificationChannelAsync: async () => {},
    getPermissionsAsync: async () => ({ granted }), requestPermissionsAsync: async () => ({ granted }),
    scheduleNotificationAsync: async request => scheduled.set(request.identifier, request),
  };
  const { configureReminder } = load('src/components/ReminderScheduler.tsx', {
    '@/src/lib/local-notifications': notifications, 'react-native': { Platform: { OS: 'android' } }, '@/src/context/AppState': {},
  });
  await Promise.all([configureReminder(true, '08:00'), configureReminder(true, '20:30')]);
  assert.equal(scheduled.size, 1);
  assert.equal([...scheduled.values()][0].trigger.hour, 20);
  await configureReminder(false, '20:30'); assert.equal(scheduled.size, 0);
  granted = false; await assert.rejects(configureReminder(true, '08:00', true), /Allow/);
  await assert.rejects(configureReminder(true, '25:00'), /valid/);
});

test('route import and web scheduling never load native notifications', async () => {
  let imports = 0;
  const mocks = { 'react-native': { Platform: { OS: 'web' } }, '@/src/context/AppState': {} };
  Object.defineProperty(mocks, '@/src/lib/local-notifications', { get() { imports++; throw Error('Native module unavailable'); } });
  const web = load('src/components/ReminderScheduler.tsx', mocks);
  await web.configureReminder(false, '08:00');
  await assert.rejects(web.configureReminder(true, '08:00'), /mobile app/);
  assert.equal(imports, 0);
  mocks['react-native'].Platform.OS = 'android';
  const native = load('src/components/ReminderScheduler.tsx', mocks);
  assert.equal(imports, 0);
  await assert.rejects(native.configureReminder(true, '08:00'), /Native module unavailable/);
});

test('installed local notification entry points never import push registration', () => {
  const seen = new Set();
  function visit(file) {
    if (seen.has(file)) return;
    seen.add(file);
    assert.doesNotMatch(file, /(?:TokenEmitter|DevicePushTokenAutoRegistration|warnOfExpoGoPushUsage|getDevicePushTokenAsync|\/build\/index)\./);
    const code = fs.readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
    for (const statement of ast.statements) {
      if (!(ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement))) continue;
      if (statement.isTypeOnly || statement.importClause?.isTypeOnly) continue;
      const name = statement.moduleSpecifier?.text;
      if (!name || (!name.startsWith('.') && !name.startsWith('expo-notifications'))) continue;
      const target = name.startsWith('.') ? path.resolve(path.dirname(file), name) : require.resolve(name, { paths: [root] }).replace(/\.js$/, '');
      const variants = ['', '.android', '.ios', '.native', '.web'].map(suffix => target + suffix + '.js').filter(f => fs.existsSync(f));
      assert.ok(variants.length, `Missing entry point: ${name}`);
      variants.forEach(visit);
    }
  }
  visit(path.join(root, 'src/lib/local-notifications.ts'));
  assert.ok(seen.size > 10);
});

test('reader themes sync independently, validate unknown IDs and retain newer choices', () => {
  const { READER_THEMES, readerTheme } = load('src/lib/reader-themes.ts');
  assert.equal(READER_THEMES.length, 5);
  assert.equal(new Set(READER_THEMES.map(t => t.id)).size, 5);
  assert.equal(readerTheme('unknown').id, 'moonlit-orchid');
  const old = account.defaultAccount({ uid: 'theme-user' });
  const local = { ...old, settings: { ...old.settings, readerTheme: 'sakura-mist' }, settingsUpdatedAt: { readerTheme: '2026-09-18T12:00:00Z' } };
  const merged = account.mergeAccounts(old, local);
  assert.equal(merged.settings.readerTheme, 'sakura-mist');
  assert.equal(merged.settings.theme, 'dark');
  const savedDark = { ...merged, settings: { ...merged.settings, theme: 'dark' } };
  assert.equal(account.fromRemote('theme-user', savedDark).settings.theme, 'dark');
  assert.equal(account.fromRemote('theme-user', merged).settings.readerTheme, 'sakura-mist');
});

test('hydration rebuilds canonical counters and rejects another account cache', () => {
  let a = account.defaultAccount({ uid: 'a' });
  a = account.addProgress(a, 'phone', { hasanaat: 120, ayat: 2, seconds: 12 }, '2026-09-17');
  a = account.addProgress(a, 'tablet', { hasanaat: 180, ayat: 3, seconds: 18 }, '2026-09-18');
  const restored = account.fromRemote('a', { ...a, totalHasanaat: 99999, completedReads: 99999, history: {} });
  assert.equal(restored.totalHasanaat, 300);
  assert.equal(restored.completedReads, 5);
  assert.equal(restored.history['2026-09-17'].hasanaat, 120);
  assert.equal(account.fromRemote('b', a).totalHasanaat, 0);
  const legacy = account.fromRemote('a', { totalHasanaat: 1000, history: { '2026-09-17': { hasanaat: 200, ayat: 2 } } });
  assert.equal(legacy.totalHasanaat, 1000);
  assert.equal(legacy.completedReads, 2);
  assert.equal(dates.weekDays(new Date(2026, 8, 20))[0].key, '2026-09-14');
});

test('reading timer accounts for delayed ticks and splits local midnight', () => {
  const { readingSecondsBetween } = load('src/lib/reading-clock.ts');
  const start = new Date(2026, 8, 17, 23, 59, 58).getTime();
  const deltas = readingSecondsBetween(start, start + 6500);
  assert.equal(deltas['2026-09-17'], 2);
  assert.equal(deltas['2026-09-18'], 4);
  assert.equal(Object.values(readingSecondsBetween(start, start + 500)).length, 0);
  assert.equal(Object.values(readingSecondsBetween(start, start - 100)).length, 0);
});

test('legacy Firestore timestamps survive hydration and newer edits win', () => {
  const timestamp = { type: 'firestore/timestamp/1.0', seconds: 1789688647, nanoseconds: 288000000 };
  const remote = account.fromRemote('a', { uid: 'a', updatedAt: timestamp, profileUpdatedAt: timestamp, fullName: 'Old', currentAyah: 8, settings: { dailyGoal: 10 }, settingsUpdatedAt: { dailyGoal: timestamp } });
  assert.equal(remote.updatedAt, new Date(1789688647288).toISOString());
  const local = account.fromRemote('a', { uid: 'a', fullName: 'New', currentAyah: 9, updatedAt: '2026-09-18T12:00:00Z', profileUpdatedAt: '2026-09-18T12:00:00Z', settings: { dailyGoal: 25 }, settingsUpdatedAt: { dailyGoal: '2026-09-18T12:00:00Z' } });
  const merged = account.mergeAccounts(remote, local);
  assert.equal(merged.fullName, 'New');
  assert.equal(merged.currentAyah, 9);
  assert.equal(merged.settings.dailyGoal, 25);
  assert.equal(typeof merged.profileUpdatedAt, 'string');
  assert.equal(account.accountTimestamp({ seconds: NaN }), new Date(0).toISOString());
});

test('sync queue prevents concurrent commits and continues after rejection', async () => {
  const { createSyncQueue } = load('src/lib/sync-queue.ts');
  const queue = createSyncQueue();
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const events = [];
  const first = queue(async () => { events.push('start1'); await blocked; events.push('end1'); });
  const second = queue(async () => { events.push('start2'); throw new Error('simulated failure'); });
  const rejected = assert.rejects(second, /simulated failure/);
  const third = queue(async () => { events.push('start3'); });
  await settle();
  assert.deepEqual(events, ['start1']);
  release();
  await Promise.all([first, rejected, third]);
  assert.deepEqual(events, ['start1', 'end1', 'start2', 'start3']);
});

test('account cache writes coalesce bursts, stay ordered and isolate user keys', async () => {
  const { createAccountWriter } = load('src/lib/account-writer.ts');
  const writes = [];
  const writer = createAccountWriter(async (key, value) => { writes.push([key, value]); return true; });
  const a = writer('account-A', 1);
  const b = writer('account-A', 2);
  const c = writer('account-B', 3);
  assert.equal(writes.length, 0, 'storage serialization stays outside the tap callback');
  assert.deepEqual(await Promise.all([a, b, c]), [true, true, true]);
  assert.deepEqual(writes, [['account-A', 2], ['account-B', 3]]);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let started;
  const active = new Promise(resolve => { started = resolve; });
  const serial = createAccountWriter(async (key, value) => { if (value === 1) { started(); await gate; } writes.push([key, value]); return true; });
  const first = serial('account-C', 1); await active;
  const last = serial('account-C', 2); release();
  await Promise.all([first, last]);
  assert.deepEqual(writes.slice(-2), [['account-C', 1], ['account-C', 2]]);
});

test('daily name follows local midnight through DST and timezone changes', () => {
  const { nameOfDay } = load('src/data/names99.ts');
  const oldTZ = process.env.TZ;
  try {
    for (const zone of ['America/Vancouver', 'Asia/Qatar', 'Pacific/Auckland']) {
      process.env.TZ = zone;
      const before = new Date(2026, 10, 1, 23, 59, 59);
      const after = new Date(2026, 10, 2, 0, 0, 0);
      assert.equal(dates.localDayNumber(after) - dates.localDayNumber(before), 1);
      assert.notEqual(nameOfDay(dates.localDayNumber(after)).number, nameOfDay(dates.localDayNumber(before)).number);
      assert.equal(nameOfDay(dates.localDayNumber(new Date(2026, 10, 1, 1))).number, nameOfDay(dates.localDayNumber(before)).number);
    }
  } finally { if (oldTZ === undefined) delete process.env.TZ; else process.env.TZ = oldTZ; }
});

test('multi-day device sync preserves exact totals across replay and merge order', () => {
  const base = account.defaultAccount({ uid: 'counts' });
  const phone = account.addProgress(account.addProgress(base, 'phone', { hasanaat: 100, ayat: 1, seconds: 10 }, '2026-09-17'), 'phone', { hasanaat: 200, ayat: 2, seconds: 20 }, '2026-09-18');
  const tablet = account.addProgress(base, 'tablet', { hasanaat: 300, ayat: 3, seconds: 30 }, '2026-09-18');
  const dashboard = load('src/lib/dashboard.ts');
  for (const merged of [account.mergeAccounts(phone, tablet), account.mergeAccounts(tablet, phone)]) {
    const replay = account.fromRemote('counts', account.mergeAccounts(merged, phone));
    const today = dashboard.dashboardStats(replay, 'today', new Date(2026, 8, 18, 12));
    assert.equal(today.hasanaat, 500); assert.equal(today.ayat, 5); assert.equal(today.seconds, 50);
    const week = dashboard.dashboardStats(replay, 'week', new Date(2026, 8, 18, 12));
    assert.equal(week.hasanaat, 600); assert.equal(week.ayat, 6); assert.equal(week.seconds, 60);
    assert.equal(replay.totalHasanaat, 600); assert.equal(replay.completedReads, 6);
    assert.equal(dates.computeStreak(replay.history, new Date(2026, 8, 18, 12)), 2);
  }
});
