"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Square } from "lucide-react";
import { captureText } from "@/lib/capture";
import { useApp } from "@/components/providers/AppProviders";
import { useToast } from "@/components/providers/ToastProvider";

// Minimal typing for the Web Speech API (not in TypeScript's DOM lib).
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function CaptureBar() {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const { refreshData } = useApp();
  const toast = useToast();

  useEffect(() => {
    setMicSupported(getRecognitionCtor() !== null);
    return () => recognition.current?.stop();
  }, []);

  function toggleMic() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-CA";
    rec.interimResults = true;
    rec.continuous = false;
    const prefix = text.trim() ? `${text.trim()} ` : "";
    rec.onresult = (e) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript;
      setText(prefix + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed") toast.error("Microphone access is blocked");
    };
    recognition.current = rec;
    setListening(true);
    rec.start();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || saving) return;
    recognition.current?.stop();
    setSaving(true);
    try {
      const result = await captureText(value);
      setText("");
      refreshData();
      toast.show({
        message: result.message,
        actionLabel: "Undo",
        onAction: async () => {
          try {
            await result.undo();
            setText(value);
            refreshData();
          } catch (err) {
            toast.error("Couldn't undo", err);
          }
        },
      });
    } catch (err) {
      toast.error("Couldn't save that. Try again.", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-2.5">
      <div className="relative flex-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={listening ? "Listening…" : "Type or tap the mic…"}
          aria-label="Capture something"
          enterKeyHint="send"
          className="h-12 w-full rounded-full bg-white pl-5 pr-12 text-base text-ink shadow-card outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-todo/30"
        />
        {text.trim() && (
          <button
            type="submit"
            disabled={saving}
            aria-label="Add to Inbox"
            className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white disabled:opacity-50"
          >
            <ArrowUp size={18} />
          </button>
        )}
      </div>
      {micSupported && (
        <button
          type="button"
          onClick={toggleMic}
          aria-label={listening ? "Stop listening" : "Speak"}
          aria-pressed={listening}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-todo text-white shadow-card transition active:scale-95 ${
            listening ? "animate-pulse ring-4 ring-todo/30" : ""
          }`}
        >
          {listening ? <Square size={18} fill="currentColor" /> : <Mic size={22} />}
        </button>
      )}
    </form>
  );
}
