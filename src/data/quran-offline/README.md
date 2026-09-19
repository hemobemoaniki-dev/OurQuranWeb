# Bundled Quran reader data

OurQuran ships the Reader's Arabic text and English translation in local JSON chunks so changing Surahs never depends on a network request.

Source snapshot: `quran-json@3.1.2` by Risan Bagja Pradana.

- Arabic: Uthmani Quran text
- English: Saheeh International
- Upstream project: https://github.com/risan/quran-json
- Snapshot license: CC BY 4.0
- Bundled count: 114 Surahs / 6,236 Ayahs

OurQuran stores only the fields used by the Reader: Surah number, Ayah number, Arabic text, and English translation. Transliteration and other upstream metadata are intentionally omitted.
