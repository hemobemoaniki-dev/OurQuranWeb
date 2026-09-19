# OurQuran pre-launch audit — 17 September 2026

**Decision: ready for another device test, not yet cleared for public launch.**

This is a source review, static analysis, Android JavaScript/Hermes export and mocked-adapter regression audit. It is not a signed Android release build, a visual device test, a Firebase emulator test or a production security review. No production accounts were created, modified or deleted during testing.

## Fixes included

- Dashboard refresh: Home now begins with the signed-in greeting/avatar and amber streak badge, followed by a Monday–Sunday strip (green read, red past missed, neutral future, gold today marker). Today/Week/All-time filters show actual account Hasanaat, ayahs, reading time and reading days in four coloured cards. Reading days deliberately replaces the reference's Pages metric because completed-page data is not tracked. Goal editing and sync details use their dedicated screens; Continue Reading remains available. The Hasanaat/Ayah/Session capsule is now only mounted by Reader, not other tabs. Dashboard regression coverage includes period totals, missed/pending/future distinction, local-day rollover and cross-year week boundaries.

- 18 September UI follow-up: avatar display now uses embedded 160px PNGs through the native Image component instead of encoded SVG decoding. All ten PNG signatures/dimensions are checked. Settings is the fifth/far-right tab; the header gear and redundant Email entry are removed. Theme, notifications, language, reciter, speed, autoplay, goal and data sync have isolated destinations. The dock uses a native animated selection outline and press scaling, with reduced-motion support.
- Performance follow-up: session-clock ticks update only their metric, reader subscriptions exclude cloud status/counter-only updates, local persistence avoids an extra JSON clone, lists use smaller initial/batched rendering, tabs mount on demand, Continue Reading text is prefetched, and current/next audio is warmed without playing. Audio cache survives manual ayah navigation and is cleared on reader exit. No physical-device frame-time or latency guarantee has been established.
- Bismillah scope: removed the extra unnumbered reader banner. Existing API-prefix stripping remains. Numbered Quran text (including 1:1 and 27:30), translations, reward calculation for those verses and their recordings have NOT been excised. Full removal from audio needs verified reciter-specific edit boundaries; arbitrary timestamp cuts would risk truncating other words. This part of the user's literal request remains outstanding.

- 18 September: isolated local notification APIs from SDK 57's root export, which eagerly loads unsupported remote-push registration in Android Expo Go. Native notification loading is deferred and failures are handled so routes can still load. Added startup/web guards and an installed-package dependency-graph regression test. Physical reminder delivery remains unverified.
- Independent setting timestamps prevent reading activity on another device from rolling back a goal, theme, reciter or reminder preference. Profile edits also have an independent timestamp. Update both test devices to this version; older clients do not understand these timestamps.
- Cached signed-in accounts become usable before cloud reconciliation finishes. Reconciliation merges current local edits, and completed operations from an old login generation cannot update the current session.
- Surah boundaries and picker jumps set the intended ayah index together with the surah. Cross-surah autoplay waits for matching visible text. Playback completion still never advances the page.
- Quran cache/API responses must contain the expected ayahs and translations, ordered and matched by ayah number. Missing editions or incomplete responses show a retry error instead of mismatched text. Requests have a 15-second timeout.
- Profile avatars now use ten bundled vector designs. Their stable selection keys use the existing timestamped profile sync; no Firebase Storage or photo upload is needed. Unknown/legacy photo values display the default crescent until a selection is saved. Guest profile/account routes redirect to sign-in; owned usernames are released by deletion to match deployed rules; invalid usernames/blank names are rejected.
- App Settings opens the same custom goal editor as Home instead of offering conflicting presets.
- Reminder preferences now schedule/cancel a daily native notification. Changes are serialized to avoid duplicates; permission denial is reported. Each phone still needs its own notification permission. Delivery is not yet device-tested.
- Morning and evening adhkar have separate count keys; completing a dhikr no longer attempts a reset that cloud max-merge would undo. Legacy unscoped counts remain in stored data but are not attributed to a particular time of day. Rapid counter taps use the latest state.
- Reading seconds are credited to the local date on which they accrued, including a session crossing midnight. Daily displays refresh on foreground/resume and periodically while open.
- Reset-local-data invalidates pending sync completions and clears the relevant guest/timer caches. It does not delete cloud data. Errors are surfaced rather than silently claiming success.
- Runtime warnings remain visible during development.

## Verification

| Check | Result and scope |
| --- | --- |
| TypeScript | `npx tsc --noEmit` passed |
| Source lint | `npx eslint app src` passed |
| Android export | Expo produced a Hermes bundle; native compilation/install not tested |
| Reward merge | Concurrent device increments, repeat-merge idempotence and UID isolation passed |
| Settings/profile merge | Stale-device reading cannot revert a newer goal/profile; both merge directions passed |
| Bookmarks | Removal survives merge; later re-add wins |
| Guest import | Account identity preserved and repeat import does not duplicate rewards |
| Midnight accounting | Seconds allocated to two separate local dates correctly |
| 99 Names | 99 distinct names in a 99-day cycle; New Year day progression passed |
| Quran mapping | All 6,236 surah/ayah addresses across configured reciters checked; recordings not listened to |
| Quran response | Reordered editions/verses aligned; missing translation and invalid surah rejected; Bismillah handling checked |
| Audio controller | Completion stops; cancelled loads cannot play; old players pause/remove; exit stops; mocked native adapter |
| Reminder controller | Rapid replacements leave one reminder; disable cancels; permission denial/invalid time reject; mocked adapter |
| Dependency compatibility | Installed native module versions satisfy this installed Expo SDK's bundled version ranges |
| Dependency security | `npm audit --omit=dev` reported 15 moderate, zero high/critical advisories during this audit. Unresolved; production dependency classification includes build tools. Forced fixes proposed incompatible downgrades, so none were applied |
| Latest Expo compatibility lookup | `expo install --check` could not finish because the HTTP proxy timed out; local range checks do not prove latest patch availability |

Run the reusable nine-group regression suite from `frontend`:

```powershell
node --test scripts/prelaunch-check.cjs
```

## Launch blockers / unverified dependencies

1. **Production Firebase authorization:** no Firestore/Storage rules or Firebase deployment configuration were present in the repository reviewed. This does not prove deployed rules are absent. Obtain and test the actual deployed rules: account A must not read/write account B, anonymous clients must not read account documents, username claims must be protected, and avatar selection must remain owner-scoped with the profile. Storage upload is no longer used. The owner-scoped Firestore rules were reviewed from a console screenshot, but still need adversarial live tests.
2. **Live auth and cross-device tests:** registration, password-reset delivery, cold-start persistent login, sign-out, switching accounts, avatar upload and two-device/offline synchronization need real test accounts/devices. Client unit tests cannot establish any of these services work in production.
3. **Release build:** EAS build profiles are now present and the Android package is intentionally locked to the Google Play draft identity `com.ourquran.app`. A signed production AAB still has not been built or installed; verify startup, audio, avatars, notifications, network loss and small-screen/large-font layouts on the signed release before public rollout.
4. **Account deletion and privacy:** in-app deletion and the public Firebase-hosted privacy/account-deletion pages are implemented and live-tested with a throwaway account. Keep the published URLs available and re-test deletion on the signed release.
5. **Dependency advisories:** review the moderate advisories with compatible upstream patches; do not blindly run `npm audit fix --force` and downgrade Expo.
6. **Content and service availability:** audio URL construction does not certify every hosted recording or the editorial correctness/licensing of Quran translation, adhkar or names. Text and uncached audio require their external services. Have the content reviewed and verify representative recordings, including long verses and surah boundaries.
7. **Conflict limits:** settings use per-setting client timestamps; profile fields and tasbeeh remain last-write-wins. Deliberately incorrect phone clocks and simultaneous edits to the same setting/counter are not fully resolved by this model. Firebase document-size growth from long-lived per-device histories should be load-tested.

## Final device acceptance run

- Fresh install: Guest has no account identity. Read, bookmark and set a goal; restart and confirm guest-only data persists.
- Register/sign in: guest import occurs once; cloud progress survives sign-out/sign-in. Switch to a different account and confirm no identity, bookmark or progress leakage. Test reset-email receipt and link completion.
- Two devices on the same account: read simultaneously, change goal on one while reading on the other, add/remove/re-add a bookmark, change profile/avatar, go offline and reconnect. Verify no lost rewards, duplicate imports or restored deletions. Check status colours against actual saved state.
- Reader: play a long ayah, scroll, manually change verses rapidly, cross a surah boundary, open a bookmark, switch reciters, use preview, exit to Home, background and lock the phone. No audio should continue after leaving or resume from a cancelled request. Autoplay must never turn pages.
- Local midnight/timezone change: names, today's totals and morning/evening counters roll over correctly; old totals remain in history.
- Reminder: allow/deny permission, schedule a near-future time, change it, disable it, restart the installed app and switch accounts. Verify one notification at the selected local time, with no stale reminder from the previous account.
- Settings/UI: dark/light/system, large system font, smallest supported phone, landscape restrictions, keyboard open during goal/profile/password entry, Android back, permissions denied, airplane mode. Verify custom goals remain exact across sign-in and devices.

Record device models, OS versions, app commit, pass/fail and screenshots for failures. Public-launch approval should follow these checks, not just an Expo Go smoke test.

## Reader themes and progress audit — 2026-09-18

- Five reader-only palettes: Moonlit Orchid, Solar Ember, Sapphire Tide, Emerald Dusk (green reference had no name), Sakura Mist. Generated scenic backdrops reconstructed from supplied references, bundled as optimized JPEGs (~381 KB combined); no runtime image service. Responsive UI is not a pixel-identical reproduction.
- Settings > Reader Theme uses existing per-setting timestamp/account merge. App light/dark selection remains independent; dark canvas is pitch black. Reader status bar remains light in either app mode.
- Centered OurQuran identity/tagline, top-right exit, tinted metrics, matching translucent Arabic/translation cards, independently capped scroll areas plus outer overflow, native clipboard/share actions, fixed gradient action dock. Existing bookmarks, selection, manual next and audio lifecycle retained.
- Progress hydration reconstructs totals/history from canonical baseline/device counters, sanitizes invalid counter values and preserves legacy lifetime totals. Cross-account cached UID is rejected. Weekly periods consistently start Monday.
- Reading clock uses elapsed seconds, splits at local midnight and checkpoints reading totals every 10 seconds; only starts after hydration. Background/blur drains and stops. Abrupt process termination can still lose the final uncheckpointed seconds. Device clocks/timezones define local dates; server-authoritative rewards are not implemented.
- Validation: TypeScript, ESLint, 16 regression tests pass. Android Hermes export succeeded (1904 modules, 6.4 MB bundle), including all five image assets and expo-clipboard.
- Regression coverage includes themes surviving account hydration/merge without changing app theme, canonical counters, cache UID isolation, delayed clock ticks/midnight, prior avatar/bookmark/guest merge/audio cancellation/Quran data mapping/daily-name/reminder tests.
- No physical-device UI/audio/clipboard/share verification or live two-device Firebase test performed. Browser preview unavailable in this environment. Live rules, reset-email/notification delivery, signed release, deletion/privacy and dependency advisory follow-up remain outstanding. Numbered Bismillah verses and their audio have not been removed.

## Reported Commit failed-precondition warning — 2026-09-18
- The supplied commit uses an update-time precondition; installed Firebase SDK retries failed-precondition transactions. One logged attempt does not establish terminal save failure.
- Removed overlapping app-level saves with a serial queue; queued saves capture current account/version at execution, after earlier transactions settle. Firebase's transaction retries remain intact.
- Normalize Firestore Timestamp objects and serialized seconds/nanoseconds to ISO strings during hydration, including settings/profile clocks. Previously these could produce invalid date comparisons and prefer stale fields.
- Terminal non-network failures display Sync error instead of incorrectly displaying Offline. Pending local progress remains available for the existing retry loop.
- TypeScript, targeted ESLint and all 18 regressions pass, including queue serialization/recovery and legacy-timestamp merge. Live user save success still requires checking Data Sync; no live account mutation performed here.

## Reader visual polish — 2026-09-18
- Rebuilt header with equal side slots: back control remains physically on right and aligned with logo. Tagline and full theme name have separate centered rows, explicit line heights and horizontal padding; removed tight letter spacing on theme names.
- Restored all five background assets from original generated 941x1672 sources (previously 720x1279), JPEG quality 96 instead of 82. These are original-resolution assets, not 4K or newly invented detail. Combined size ~2.06 MB.
- Reduced panel base opacity from 72% to 48%, matched diagonal edge tint across Arabic, translation and action panels, softened borders, and added a continuous backdrop contrast gradient. Existing scrolling and audio behavior unchanged.
- TypeScript, targeted ESLint, all 18 regression checks and Android Hermes export passed (1905 modules). Visual Android verification remains required, especially header clipping at device font scales and scene/text contrast.

## Home, account identity, photographs and responsiveness — 2026-09-18
- Home: Continue Reading follows the week strip; redesigned the strip as compact vertical tiles instead of rings, removed its caption, replaced orange streak styling with a compact glass capsule. Dashboard card labels/values centered. Renamed Daily Quran Goal throughout settings/Home. Sync shows a larger dot and two labels only; green indicates sync enabled and saved, amber pending, red signed out/error/offline; detailed status remains accessible on tap.
- Identity: username replaces display name in Home/Settings. Registration no longer asks for a full name. Profile editor shows username then avatar selection; no bio/display-name controls. Legacy document fields retained for compatibility, not displayed.
- Ten real photographic avatars bundled locally, replacing vector/base64 designs. Stable avatar IDs preserved. Wikimedia Commons source, author and CC licenses in assets/avatars/ATTRIBUTION.md and Settings > About. Photographs remain unedited; circular crop is performed by the view.
- Dark canvas #000000, neutral black card surfaces, brighter white/secondary text and softer translucent gold borders; app themes remain independent of Reader themes.
- Responsiveness: disable stack navigation animation; mount tab screens eagerly to avoid their first-tap mount delay; keep off-screen tabs frozen. Defer/coalesce account cache serialization outside action handlers while preserving per-account write order and awaited sign-out writes. Skip local Firestore pending-write echo merges. Audio status polling reduced from 10 to 4 updates/sec; explicit navigation stop behavior retained.
- Verification: TypeScript and ESLint pass; all 21 tests pass, including local date/DST name rotation, exact multi-day/multi-device count merges and replay, account-separated ordered local persistence, prior audio/bookmark/avatar/theme regressions. Android bundle export checked separately below.
- Limits: no real-phone frame/tap latency measurements; no claim of instant network responses or bug-free release. Expo Go development performance is not a release benchmark. Live two-device Firebase sync and outstanding release/security/privacy checks still require live testing. Hasanaat are the app's letter-count estimate; completed reads count rewarded next actions including rereads, not unique verses.
- Android Hermes export succeeded: 1916 modules, 6.3 MB bundle; all ten photographic avatars included. This is a bundle check, not a signed APK/device run.
