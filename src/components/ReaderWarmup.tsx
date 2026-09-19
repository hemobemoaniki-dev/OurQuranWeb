import { useEffect } from "react";

import { warmAudioCache } from "@/src/lib/audio-cache";
import { warmAllQuranText } from "@/src/lib/quran";

// Quran text is already bundled and synchronously warmed by quran.ts. After the
// first UI frame, prepare the disk audio cache metadata/directory too.
export function ReaderWarmup() {
  useEffect(() => {
    const timer = setTimeout(() => {
      warmAllQuranText();
      void warmAudioCache();
    }, 250);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
