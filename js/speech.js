/** Speech in (Sarvam or Web Speech API) and out (Sarvam or speechSynthesis). */
import { $, micUI, note, store } from './dom.js';
import { Mascot } from './mascot.js';
import { getSarvamKey, sarvamAvailable } from './sarvam.js';

export const Speech = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, mediaRec = null, capTimer = null, listening = false, finalText = '', rate = +store.get('hb_rate', '1');
  let voices = [];
  const loadVoices = () => { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; };
  if (window.speechSynthesis) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }

  function pickVoice(lang) {
    const norm = (s) => s.replace('_', '-').toLowerCase();
    const want = norm(lang), base = want.split('-')[0];
    return voices.find((v) => norm(v.lang) === want) || voices.find((v) => norm(v.lang).startsWith(base + '-')) || null;
  }

  // Sarvam path: record a clip, then transcribe it with saaras:v4 (REST endpoint is for clips under 30 s).
  async function startSarvam(key, onInterim, onFinal) {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { note('Microphone permission was denied.'); return false; }
    const mime = ['audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t));
    const chunks = [];
    mediaRec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    mediaRec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    mediaRec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      clearTimeout(capTimer); mediaRec = null; listening = false; micUI(false);
      const blob = new Blob(chunks, { type: (chunks[0]?.type || mime || 'audio/webm').split(';')[0] });
      if (blob.size < 2000) { note('I didn\'t hear anything. Try again.'); Mascot.setMascotState('IDLE'); return; }
      Mascot.setMascotState('THINKING'); onInterim('Transcribing…');
      try {
        const { text, language } = await sarvamTranscribe(blob, key);
        onInterim(text);
        if (text) onFinal(text, language); else { note('Sarvam returned no speech. Try again.'); Mascot.setMascotState('IDLE'); }
      } catch (e) { onInterim(''); note('Sarvam: ' + e.message); Mascot.setMascotState('IDLE'); }
    };
    mediaRec.start();
    listening = true; Mascot.setMascotState('LISTENING'); micUI(true);
    capTimer = setTimeout(() => { if (mediaRec?.state === 'recording') mediaRec.stop(); }, 25000);
    return true;
  }

  // With a personal key, call Sarvam directly; otherwise go through this site's /api/sarvam proxy.
  async function sarvamTranscribe(blob, key) {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 20000);
    let url = '/api/sarvam?op=stt', init = { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob, signal: ctrl.signal };
    if (key) {
      const ext = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg' }[blob.type] || 'webm';
      const fd = new FormData();
      fd.append('file', blob, 'speech.' + ext);
      fd.append('model', 'saaras:v4');
      fd.append('language_code', 'unknown'); // let Sarvam detect the spoken language
      url = 'https://api.sarvam.ai/speech-to-text'; init = { method: 'POST', headers: { 'api-subscription-key': key }, body: fd, signal: ctrl.signal };
    }
    try {
      const r = await fetch(url, init);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error?.message || 'HTTP ' + r.status);
      return { text: (j.transcript || '').trim(), language: j.language_code || null };
    } catch (e) { throw e.name === 'AbortError' ? new Error('timed out') : e; }
    finally { clearTimeout(to); }
  }

  function start(lang, onInterim, onFinal) {
    if (sarvamAvailable() && window.MediaRecorder && navigator.mediaDevices) { stopSpeaking(); return startSarvam(getSarvamKey(), onInterim, onFinal); }
    if (!SR) { note('Speech recognition is not supported in this browser. Try Chrome or Edge, or type your question.'); return false; }
    stopSpeaking();
    rec = new SR();
    rec.lang = lang; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    finalText = '';
    rec.onstart = () => { listening = true; Mascot.setMascotState('LISTENING'); micUI(true); };
    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      onInterim((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') note('Microphone permission was denied.');
      else if (e.error === 'no-speech') note('I didn\'t hear anything. Try again.');
      else if (e.error !== 'aborted') note('Speech error: ' + e.error);
    };
    rec.onend = () => {
      listening = false; micUI(false);
      const text = finalText.trim() || $('query').value.trim();
      if (text) { Mascot.setMascotState('THINKING'); onFinal(text); } else Mascot.setMascotState('IDLE');
    };
    try { rec.start(); } catch { return false; }
    return true;
  }
  function stopListening() { if (mediaRec?.state === 'recording') mediaRec.stop(); else if (rec && listening) rec.stop(); }

  // Voice output: Sarvam (bulbul:v3) when a key is available, browser voices otherwise or if Sarvam fails.
  let audio = null, ttsSeq = 0;
  function speakText(text, lang, r = rate) {
    stopSpeaking();
    if (sarvamAvailable()) sarvamSpeak(text, lang, r, getSarvamKey()); else browserSpeak(text, lang, r);
  }

  async function sarvamSpeak(text, lang, r, key) {
    const seq = ++ttsSeq;
    try {
      const res = key
        ? await fetch('https://api.sarvam.ai/text-to-speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-subscription-key': key },
          body: JSON.stringify({ text: text.slice(0, 2500), language_code: lang, model: 'bulbul:v3', pace: r }),
        })
        : await fetch('/api/sarvam?op=tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language_code: lang, pace: r }),
        });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error?.message || 'HTTP ' + res.status);
      const clips = j.audios || [];
      if (!clips.length) throw new Error('no audio returned');
      if (seq !== ttsSeq) return; // stopped or replaced while waiting
      const play = (i) => {
        if (seq !== ttsSeq) return;
        if (i >= clips.length) { audio = null; Mascot.setMascotState('IDLE'); return; }
        audio = new Audio('data:audio/wav;base64,' + clips[i]);
        audio.onended = () => play(i + 1);
        audio.onerror = () => { audio = null; Mascot.setMascotState('IDLE'); };
        return audio.play();
      };
      Mascot.setMascotState('SPEAKING');
      await play(0);
    } catch (e) {
      if (seq !== ttsSeq) return;
      note('Sarvam voice: ' + e.message + '. Using the browser voice.');
      browserSpeak(text, lang, r);
    }
  }

  // Chrome cuts long utterances; speak sentence by sentence.
  function browserSpeak(text, lang, r) {
    if (!window.speechSynthesis) { Mascot.setMascotState('IDLE'); return; }
    speechSynthesis.cancel();
    const parts = text.match(/[^.!?।\n]+[.!?।]?/g)?.map((s) => s.trim()).filter(Boolean) || [text];
    const voice = pickVoice(lang);
    if (!voice && voices.length) note(`No ${lang} voice installed; your browser may read this with a default voice.`);
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = lang; u.rate = r; if (voice) u.voice = voice;
      if (i === 0) u.onstart = () => Mascot.setMascotState('SPEAKING');
      if (i === parts.length - 1) { u.onend = () => Mascot.setMascotState('IDLE'); u.onerror = () => Mascot.setMascotState('IDLE'); }
      speechSynthesis.speak(u);
    });
  }
  function stopSpeaking() {
    ttsSeq++;
    if (audio) { audio.pause(); audio = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (Mascot.state === 'SPEAKING') Mascot.setMascotState('IDLE');
  }
  function setRate(r) { rate = r; store.set('hb_rate', String(r)); }

  return { start, stopListening, speakText, stopSpeaking, setRate, get rate() { return rate; }, get listening() { return listening; }, supported: !!SR };
})();
