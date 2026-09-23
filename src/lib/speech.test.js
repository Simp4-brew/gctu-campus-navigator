import { afterEach, describe, expect, it, vi } from "vitest";

import { planRoute } from "./routing.js";
import { arrivalMessage, speak } from "./speech.js";

/* A stand-in for the browser's speech engine that records what it says. */
function installSpeech({ voices = [], speaking = false } = {}) {
  const synth = {
    speaking,
    pending: false,
    paused: false,
    getVoices: vi.fn(() => voices),
    speak: vi.fn(),
    cancel: vi.fn(),
    resume: vi.fn(),
  };

  window.speechSynthesis = synth;
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };

  return synth;
}

describe("speak", () => {
  afterEach(() => {
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });

  it("speaks in English, with an English voice when one is available", () => {
    const english = { lang: "en-GB", name: "English" };
    const synth = installSpeech({ voices: [{ lang: "fr-FR" }, english] });

    speak("You have arrived.");

    const utterance = synth.speak.mock.calls[0][0];
    expect(utterance.text).toBe("You have arrived.");
    expect(utterance.lang).toBe("en-GB");
    expect(utterance.voice).toBe(english);
  });

  it("still speaks before the voice list has loaded (common on phones)", () => {
    const synth = installSpeech({ voices: [] });

    speak("Starting navigation.");

    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.speak.mock.calls[0][0].voice).toBeUndefined();
  });

  it("clears a stuck announcement first, so Android does not stay silent", () => {
    const synth = installSpeech({ speaking: true });

    speak("You have arrived.");

    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalled();
  });

  it("does nothing, without throwing, where speech is unsupported", () => {
    expect(() => speak("Hello")).not.toThrow();
  });
});

describe("arrivalMessage", () => {
  it("names the destination building", () => {
    expect(arrivalMessage(planRoute("gate", "focis"))).toBe(
      "You have arrived at Faculty of Computing (FoCIS). Enjoy GCTU campus!",
    );
  });

  it("reads out the indoor step for a place inside a building", () => {
    expect(arrivalMessage(planRoute("gate", "library"))).toBe(
      "You have arrived. Enter the Main Administration Building and take the stairs to the First Floor for the GCTU Central Library.",
    );
  });
});
