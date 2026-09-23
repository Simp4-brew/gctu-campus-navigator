/* =========================================================
   Spoken announcements (Web Speech API), made to work on
   phones as well as laptops.

   - iPhone/iPad (every browser there is Safari underneath)
     only allows speech that was first started inside a tap.
     Calling speak() from the "Walk Demo" / "Real Device GPS"
     button handlers unlocks it for the later, timer-driven
     arrival announcement.
   - Chrome on Android can leave an utterance stuck in the
     queue, silencing everything after it, and may not have
     loaded its voice list yet. Clear the queue first, set an
     English language, and use an English voice once loaded.
========================================================= */

const LANGUAGE = "en-GB";

export function isSpeechSupported() {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

function englishVoice(synth) {
  const voices = synth.getVoices?.() ?? [];

  return (
    voices.find((voice) => /^en[-_](GB|US)/i.test(voice.lang)) ??
    voices.find((voice) => /^en/i.test(voice.lang)) ??
    null
  );
}

// Voice lists load asynchronously on most mobile browsers; asking once
// at start-up means they are usually ready by the first announcement.
if (isSpeechSupported()) {
  window.speechSynthesis.getVoices?.();
}

/* Speak `text`, replacing anything still being said. Never throws:
   speech is a nice-to-have and must not break navigation. */
export function speak(text) {
  if (!isSpeechSupported() || !text) return;

  const synth = window.speechSynthesis;

  try {
    if (synth.speaking || synth.pending) synth.cancel();
    if (synth.paused) synth.resume();

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = LANGUAGE;
    utterance.rate = 1;

    const voice = englishVoice(synth);
    if (voice) utterance.voice = voice;

    synth.speak(utterance);
  } catch (err) {
    console.warn("Speech announcement failed:", err);
  }
}

/* What to say on arrival. For a place inside a building the route ends
   at the building, so the indoor step (e.g. "take the stairs to the First
   Floor") is read out as well. */
export function arrivalMessage(route) {
  const lastStep = route.steps[route.steps.length - 1];

  if (lastStep?.indoor) {
    return `You have arrived. ${lastStep.text}`;
  }

  return `You have arrived at ${route.endName}. Enjoy GCTU campus!`;
}
