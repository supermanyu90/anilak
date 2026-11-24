/** Speech in (Sarvam or Web Speech API) and out (Sarvam or speechSynthesis): recording, playback and state. */
import { RECORDING_MIME_TYPES, SARVAM, STORAGE_KEYS } from './config.js';
import { $, micUI, note, store } from './dom.js';
import { logger } from './lib/log.js';
import { synthesize, transcribe } from './lib/sarvam-client.js';
import { Mascot } from './mascot.js';
import { getSarvamKey, sarvamAvailable } from './sarvam-access.js';

/** @typedef {(text: string) => void} InterimHandler */
/** @typedef {(text: string, language?: string | null) => void} FinalHandler */

const log = logger('speech');

export const Speech = (() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  /** @type {any} */
  let recognition = null;
  /** @type {MediaRecorder | null} */
  let recorder = null;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let recordingCap;
  let listening = false;
  let finalText = '';
  let rate = +store.get(STORAGE_KEYS.RATE, '1');

  /** @type {SpeechSynthesisVoice[]} */
  let voices = [];
  const loadVoices = () => {
    voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  };
  if (window.speechSynthesis) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  /** @param {string} lang BCP-47 */
  function pickVoice(lang) {
    const norm = (/** @type {string} */ s) => s.replace('_', '-').toLowerCase();
    const want = norm(lang);
    const base = want.split('-')[0];
    return voices.find((v) => norm(v.lang) === want) || voices.find((v) => norm(v.lang).startsWith(base + '-')) || null;
  }

  // ---------- Speech in ----------

  /** Sarvam path: record a clip (tap again to stop, auto-stop at the cap), then transcribe it. */
  async function startSarvam(
    /** @type {string} */ key,
    /** @type {InterimHandler} */ onInterim,
    /** @type {FinalHandler} */ onFinal,
  ) {
    /** @type {MediaStream} */
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      log.debug('getUserMedia rejected', e);
      note('Microphone permission was denied.');
      return false;
    }
    const mime = RECORDING_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    /** @type {Blob[]} */
    const chunks = [];
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      clearTimeout(recordingCap);
      recorder = null;
      listening = false;
      micUI(false);
      const clip = new Blob(chunks, { type: (chunks[0]?.type || mime || 'audio/webm').split(';')[0] });
      if (clip.size < SARVAM.MIN_CLIP_BYTES) {
        note("I didn't hear anything. Try again.");
        Mascot.setMascotState('IDLE');
        return;
      }
      Mascot.setMascotState('THINKING');
      onInterim('Transcribing…');
      try {
        const { text, language } = await transcribe(clip, key || undefined);
        onInterim(text);
        if (text) onFinal(text, language);
        else {
          note('Sarvam returned no speech. Try again.');
          Mascot.setMascotState('IDLE');
        }
      } catch (e) {
        log.warn('Sarvam transcription failed', e);
        onInterim('');
        note('Sarvam: ' + /** @type {Error} */ (e).message);
        Mascot.setMascotState('IDLE');
      }
    };
    recorder.start();
    listening = true;
    Mascot.setMascotState('LISTENING');
    micUI(true);
    recordingCap = setTimeout(() => {
      if (recorder?.state === 'recording') recorder.stop();
    }, SARVAM.MAX_RECORDING_MS);
    return true;
  }

  /** Browser path: Web Speech API with live interim transcripts. */
  function startBrowser(
    /** @type {string} */ lang,
    /** @type {InterimHandler} */ onInterim,
    /** @type {FinalHandler} */ onFinal,
  ) {
    recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    finalText = '';
    recognition.onstart = () => {
      listening = true;
      Mascot.setMascotState('LISTENING');
      micUI(true);
    };
    recognition.onresult = (/** @type {any} */ e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      onInterim((finalText + interim).trim());
    };
    recognition.onerror = (/** @type {any} */ e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') note('Microphone permission was denied.');
      else if (e.error === 'no-speech') note("I didn't hear anything. Try again.");
      else if (e.error !== 'aborted') {
        log.warn('speech recognition error', e.error);
        note('Speech error: ' + e.error);
      }
    };
    recognition.onend = () => {
      listening = false;
      micUI(false);
      const text = finalText.trim() || $('query').value.trim();
      if (text) {
        Mascot.setMascotState('THINKING');
        onFinal(text);
      } else Mascot.setMascotState('IDLE');
    };
    try {
      recognition.start();
    } catch (e) {
      log.warn('speech recognition could not start', e);
      return false;
    }
    return true;
  }

  /**
   * @param {string} lang language picker value (used by the browser recogniser; Sarvam auto-detects)
   * @param {InterimHandler} onInterim
   * @param {FinalHandler} onFinal
   */
  function start(lang, onInterim, onFinal) {
    if (sarvamAvailable() && window.MediaRecorder && navigator.mediaDevices) {
      stopSpeaking();
      return startSarvam(getSarvamKey(), onInterim, onFinal);
    }
    if (!SpeechRecognition) {
      note('Speech recognition is not supported in this browser. Try Chrome or Edge, or type your question.');
      return false;
    }
    stopSpeaking();
    return startBrowser(lang, onInterim, onFinal);
  }

  function stopListening() {
    if (recorder?.state === 'recording') recorder.stop();
    else if (recognition && listening) recognition.stop();
  }

  // ---------- Speech out ----------

  /** @type {HTMLAudioElement | null} */
  let audio = null;
  /** Incremented on every new utterance or stop, so stale async playback can tell it was cancelled. */
  let utteranceId = 0;

  /** @param {string} text @param {string} lang @param {number} [pace] */
  function speakText(text, lang, pace = rate) {
    stopSpeaking();
    if (sarvamAvailable()) sarvamSpeak(text, lang, pace, getSarvamKey());
    else browserSpeak(text, lang, pace);
  }

  /** Sarvam voice; falls back to the browser voice if Sarvam or playback fails. */
  async function sarvamSpeak(
    /** @type {string} */ text,
    /** @type {string} */ lang,
    /** @type {number} */ pace,
    /** @type {string} */ key,
  ) {
    const id = ++utteranceId;
    try {
      const clips = await synthesize(text, lang, pace, key || undefined);
      if (id !== utteranceId) return; // stopped or replaced while waiting
      /** @param {number} i @returns {Promise<void> | void} */
      const play = (i) => {
        if (id !== utteranceId) return;
        if (i >= clips.length) {
          audio = null;
          Mascot.setMascotState('IDLE');
          return;
        }
        audio = new Audio('data:audio/wav;base64,' + clips[i]);
        audio.onended = () => play(i + 1);
        audio.onerror = () => {
          log.warn('audio playback error');
          audio = null;
          Mascot.setMascotState('IDLE');
        };
        return audio.play();
      };
      Mascot.setMascotState('SPEAKING');
      await play(0);
    } catch (e) {
      if (id !== utteranceId) return;
      log.warn('Sarvam voice failed; using the browser voice', e);
      note('Sarvam voice: ' + /** @type {Error} */ (e).message + '. Using the browser voice.');
      browserSpeak(text, lang, pace);
    }
  }

  /** Browser voice. Chrome cuts long utterances, so speak sentence by sentence. */
  function browserSpeak(/** @type {string} */ text, /** @type {string} */ lang, /** @type {number} */ pace) {
    if (!window.speechSynthesis) {
      Mascot.setMascotState('IDLE');
      return;
    }
    speechSynthesis.cancel();
    const sentences = text
      .match(/[^.!?।\n]+[.!?।]?/g)
      ?.map((s) => s.trim())
      .filter(Boolean) || [text];
    const voice = pickVoice(lang);
    if (!voice && voices.length) note(`No ${lang} voice installed; your browser may read this with a default voice.`);
    sentences.forEach((sentence, i) => {
      const u = new SpeechSynthesisUtterance(sentence);
      u.lang = lang;
      u.rate = pace;
      if (voice) u.voice = voice;
      if (i === 0) u.onstart = () => Mascot.setMascotState('SPEAKING');
      if (i === sentences.length - 1) {
        u.onend = () => Mascot.setMascotState('IDLE');
        u.onerror = () => Mascot.setMascotState('IDLE');
      }
      speechSynthesis.speak(u);
    });
  }

  function stopSpeaking() {
    utteranceId++;
    if (audio) {
      audio.pause();
      audio = null;
    }
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (Mascot.state === 'SPEAKING') Mascot.setMascotState('IDLE');
  }

  /** @param {number} r */
  function setRate(r) {
    rate = r;
    store.set(STORAGE_KEYS.RATE, String(r));
  }

  return {
    start,
    stopListening,
    speakText,
    stopSpeaking,
    setRate,
    get rate() {
      return rate;
    },
    get listening() {
      return listening;
    },
    supported: Boolean(SpeechRecognition),
  };
})();
