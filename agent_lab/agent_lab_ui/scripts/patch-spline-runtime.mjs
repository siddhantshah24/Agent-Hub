/**
 * Patches @splinetool/runtime for common "Missing property" noise from published scenes:
 *
 * 1) Timeline audio track with no `audio` asset — replace throw with warn + skip.
 * 2) State tween / timeline build failures — older bundles log `console.error(s.message)` in
 *    `buildTimeline` / `play()`; newer bundles rethrow `new Error("Missing property")` from a
 *    `catch(a){ throw !1&&console.error(a), new Error("Missing property") }` block. Both
 *    surface in Next dev. We neutralize those.
 *
 * Idempotent: safe to run multiple times. Re-run after `npm install`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimeJs = path.join(
  __dirname,
  "..",
  "node_modules",
  "@splinetool",
  "runtime",
  "build",
  "runtime.js"
);

const AUDIO_FROM =
  'if(!s)throw new Error("Missing property");try{let c=typeof s=="string"?i.getAudio(s).src:s.data;this.audioPlayer=new tl({src:c,volume:o,delay:a,loop:l})}catch{console.warn(`Could not create an audio player for this object: "${r.name}" and this audio: "${s}"`)}Lg.has(r.uuid)?Lg.get(r.uuid).push(this):Lg.set(r.uuid,[this]),VF.set(t,this)}playByToggle(){';

const AUDIO_TO =
  'if(!s)console.warn("Spline: missing audio asset for timeline track; skipping");else try{let c=typeof s=="string"?i.getAudio(s).src:s.data;this.audioPlayer=new tl({src:c,volume:o,delay:a,loop:l})}catch{console.warn(`Could not create an audio player for this object: "${r.name}" and this audio: "${s}"`)}Lg.has(r.uuid)?Lg.get(r.uuid).push(this):Lg.set(r.uuid,[this]),VF.set(t,this)}playByToggle(){';

/** Unique in v1.12.70 — timeline error logging (see dp.buildTimeline / play complete). */
const TIMELINE_CATCH_S =
  "catch(s){s instanceof Error&&console.error(s.message)}";
const TIMELINE_CATCH_S_TO = "catch(s){}";

const PLAY_CATCH_R =
  "catch(r){r instanceof Error&&console.error(r.message)}";
const PLAY_CATCH_R_TO = "catch(r){}";

/** Newer minified runtime: timeline `complete` path throws generic "Missing property". */
const TIMELINE_THROW_MISSING =
  'catch(a){throw!1&&console.error(a),new Error("Missing property")}';
const TIMELINE_THROW_MISSING_TO = "catch(a){}";

if (!fs.existsSync(runtimeJs)) {
  process.exit(0);
}

let src = fs.readFileSync(runtimeJs, "utf8");
const original = src;

if (src.includes(AUDIO_FROM)) {
  src = src.replace(AUDIO_FROM, AUDIO_TO);
}

if (src.includes(TIMELINE_CATCH_S)) {
  src = src.replace(TIMELINE_CATCH_S, TIMELINE_CATCH_S_TO);
}

if (src.includes(PLAY_CATCH_R)) {
  src = src.replace(PLAY_CATCH_R, PLAY_CATCH_R_TO);
}

if (src.includes(TIMELINE_THROW_MISSING)) {
  src = src.replace(TIMELINE_THROW_MISSING, TIMELINE_THROW_MISSING_TO);
}

if (src !== original) {
  fs.writeFileSync(runtimeJs, src);
  console.log("[patch-spline-runtime] Applied @splinetool/runtime patches.");
} else {
  const audioOk =
    src.includes("Spline: missing audio asset for timeline track; skipping") ||
    !src.includes(AUDIO_FROM);
  const timelineThrowOk = !src.includes(TIMELINE_THROW_MISSING);
  if (!audioOk || !timelineThrowOk) {
    console.warn(
      "[patch-spline-runtime] Some patches did not apply; @splinetool/runtime bundle may have changed."
    );
  }
}
