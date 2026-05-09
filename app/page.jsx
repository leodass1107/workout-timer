"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Settings2,
  X,
  Volume2,
  Mic2,
  Gauge,
  Timer,
  Hash,
  Target,
  ArrowUp,
  ArrowDown,
  Zap,
  Check,
} from "lucide-react";

export default function WorkoutTimer() {
  // Range and timing config
  const [startNum, setStartNum] = useState(1);
  const [endNum, setEndNum] = useState(100);
  const [countInterval, setCountInterval] = useState(1.0);
  const [gapEvery, setGapEvery] = useState(10);
  const [gapDuration, setGapDuration] = useState(3.0);
  const [preCountdownLen, setPreCountdownLen] = useState(3);

  // Behavior toggles
  const [preCountdown, setPreCountdown] = useState(true);
  const [announceRest, setAnnounceRest] = useState(true);
  const [countDirection, setCountDirection] = useState("up");

  // Voice config
  const [voices, setVoices] = useState([]);
  const [voiceIdx, setVoiceIdx] = useState(0);
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [voicePitch, setVoicePitch] = useState(0.85);
  const [voiceVolume, setVoiceVolume] = useState(1.0);

  // Runtime state
  const [current, setCurrent] = useState(1);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("idle");
  const [preValue, setPreValue] = useState(3);
  const [gapRemaining, setGapRemaining] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const timerRef = useRef(null);
  const rafRef = useRef(null);

  // Load and filter male voices
  useEffect(() => {
    const load = () => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      const all = window.speechSynthesis.getVoices();
      const maleKeywords = [
        "male", "david", "mark", "daniel", "alex", "fred", "tom", "james",
        "john", "george", "paul", "ryan", "aaron", "arthur", "eric",
        "diego", "jorge", "juan", "oliver", "oskar", "xander", "reed",
        "rocko", "ralph", "albert", "thomas", "rishi", "gordon", "jacques",
        "luca", "guy", "brian", "matthew", "justin", "kevin", "michael",
      ];
      let list = all.filter((v) => {
        const n = v.name.toLowerCase();
        if (n.includes("female") || n.includes("woman") || n.includes("girl"))
          return false;
        return maleKeywords.some((k) => n.includes(k));
      });
      if (list.length === 0) list = all.filter((v) => v.lang.startsWith("en"));
      if (list.length === 0) list = all;
      setVoices(list);
    };
    load();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.addEventListener("voiceschanged", load);
      return () =>
        window.speechSynthesis.removeEventListener("voiceschanged", load);
    }
  }, []);

  const speak = useCallback(
    (text) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text));
      if (voices[voiceIdx]) u.voice = voices[voiceIdx];
      u.rate = voiceRate;
      u.pitch = voicePitch;
      u.volume = voiceVolume;
      window.speechSynthesis.speak(u);
    },
    [voices, voiceIdx, voiceRate, voicePitch, voiceVolume]
  );

  const clearAll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    timerRef.current = null;
    rafRef.current = null;
  };

  // Pre-countdown loop
  useEffect(() => {
    if (!running || mode !== "pre") return;
    speak(preValue);
    timerRef.current = setTimeout(() => {
      if (preValue > 1) {
        setPreValue((v) => v - 1);
      } else {
        setCurrent(countDirection === "up" ? startNum : endNum);
        setMode("counting");
      }
    }, 1000);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, preValue]);

  // Counting loop
  useEffect(() => {
    if (!running || mode !== "counting") return;
    speak(current);
    timerRef.current = setTimeout(() => {
      const atEnd =
        countDirection === "up" ? current >= endNum : current <= startNum;
      if (atEnd) {
        setMode("done");
        speak("Workout complete. Great job.");
        setRunning(false);
        return;
      }
      const origin = countDirection === "up" ? startNum : endNum;
      const done = Math.abs(current - origin) + 1;
      if (done % gapEvery === 0 && gapDuration > 0) {
        if (announceRest) speak("Rest");
        setGapRemaining(gapDuration);
        setMode("gap");
      } else {
        setCurrent((c) => (countDirection === "up" ? c + 1 : c - 1));
      }
    }, countInterval * 1000);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, current]);

  // Gap countdown
  useEffect(() => {
    if (!running || mode !== "gap") return;
    const startT = performance.now();
    const startingRemaining = gapRemaining;
    const tick = () => {
      const elapsed = (performance.now() - startT) / 1000;
      const remaining = Math.max(0, startingRemaining - elapsed);
      setGapRemaining(remaining);
      if (remaining <= 0) {
        setCurrent((c) => (countDirection === "up" ? c + 1 : c - 1));
        setMode("counting");
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode]);

  // Controls
  const handlePlay = () => {
    clearAll();
    if (mode === "done") {
      setCurrent(countDirection === "up" ? startNum : endNum);
      setMode("idle");
    }
    if (mode === "idle") {
      if (preCountdown && preCountdownLen > 0) {
        setPreValue(preCountdownLen);
        setMode("pre");
      } else {
        setCurrent(countDirection === "up" ? startNum : endNum);
        setMode("counting");
      }
    }
    setRunning(true);
  };

  const handlePause = () => {
    clearAll();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setRunning(false);
  };

  const handleReset = () => {
    clearAll();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setRunning(false);
    setCurrent(countDirection === "up" ? startNum : endNum);
    setMode("idle");
    setGapRemaining(0);
    setPreValue(preCountdownLen);
  };

  const applyPreset = (key) => {
    const presets = {
      standard: { startNum: 1, endNum: 100, countInterval: 1.0, gapEvery: 10, gapDuration: 3.0 },
      fast:     { startNum: 1, endNum: 100, countInterval: 0.6, gapEvery: 10, gapDuration: 2.0 },
      slow:     { startNum: 1, endNum: 50,  countInterval: 2.0, gapEvery: 10, gapDuration: 5.0 },
      hiit:     { startNum: 1, endNum: 40,  countInterval: 1.0, gapEvery: 20, gapDuration: 10.0 },
      tabata:   { startNum: 1, endNum: 20,  countInterval: 1.0, gapEvery: 20, gapDuration: 10.0 },
      continuous:{ startNum: 1, endNum: 100, countInterval: 1.0, gapEvery: 100, gapDuration: 0 },
    };
    const p = presets[key];
    if (!p) return;
    setStartNum(p.startNum);
    setEndNum(p.endNum);
    setCountInterval(p.countInterval);
    setGapEvery(p.gapEvery);
    setGapDuration(p.gapDuration);
    handleReset();
  };

  // Derived values
  const total = Math.abs(endNum - startNum) + 1;
  const countedSoFar =
    mode === "idle" || mode === "pre"
      ? 0
      : countDirection === "up"
      ? current - startNum + 1
      : endNum - current + 1;
  const progress = Math.min(1, Math.max(0, countedSoFar / total));

  const displayNumber =
    mode === "pre"
      ? preValue
      : mode === "gap"
      ? Math.ceil(gapRemaining)
      : mode === "done"
      ? countDirection === "up"
        ? endNum
        : startNum
      : current;

  const segmentCount = Math.max(1, Math.floor(total / gapEvery));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400..700&display=swap');

        .font-display { font-family: 'Fraunces', ui-serif, Georgia, serif; font-variation-settings: 'opsz' 144; }
        .font-italic { font-family: 'Instrument Serif', ui-serif, Georgia, serif; font-style: italic; }
        .font-sans { font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif; }

        @keyframes numberPop {
          0% { opacity: 0; transform: scale(0.94) translateY(6px); filter: blur(4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        .num-pop { animation: numberPop 0.32s cubic-bezier(0.16, 1, 0.3, 1); }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .fade-up-1 { animation-delay: 0.05s; }
        .fade-up-2 { animation-delay: 0.15s; }
        .fade-up-3 { animation-delay: 0.25s; }
        .fade-up-4 { animation-delay: 0.35s; }

        @keyframes drawerIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .drawer-in { animation: drawerIn 0.35s cubic-bezier(0.16, 1, 0.3, 1); }

        @keyframes backdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .backdrop-in { animation: backdropIn 0.3s ease-out; }

        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        .breathe { animation: breathe 1.8s ease-in-out infinite; }

        .grain-layer::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
          opacity: 0.12;
          mix-blend-mode: multiply;
          pointer-events: none;
          z-index: 1;
        }

        .warm-bg {
          background-color: #EFE8DB;
          background-image:
            radial-gradient(ellipse 80% 50% at 15% 0%, rgba(212, 60, 40, 0.07) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 100% 100%, rgba(139, 115, 85, 0.10) 0%, transparent 55%);
        }

        input[type='range'].brand-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 3px;
          background: rgba(28, 25, 23, 0.12);
          outline: none;
          border-radius: 2px;
          cursor: pointer;
        }
        input[type='range'].brand-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #1C1917;
          cursor: pointer;
          border: 3px solid #F5F0E5;
          box-shadow: 0 2px 6px rgba(28, 25, 23, 0.25);
          transition: transform 0.15s ease, background 0.15s ease;
        }
        input[type='range'].brand-range::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          background: #D4321C;
        }
        input[type='range'].brand-range::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #1C1917;
          cursor: pointer;
          border: 3px solid #F5F0E5;
        }

        .hide-scrollbar::-webkit-scrollbar { width: 6px; }
        .hide-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .hide-scrollbar::-webkit-scrollbar-thumb { background: rgba(28,25,23,0.15); border-radius: 3px; }

        .btn-lift { transition: transform 0.15s ease, box-shadow 0.25s ease; }
        .btn-lift:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(28,25,23,0.12); }
        .btn-lift:active { transform: translateY(0) scale(0.97); }

        select.brand-select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236B5E4A'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 1em;
          -webkit-appearance: none;
          appearance: none;
        }

        /* Hide native number-input spin buttons */
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      <div
        className="warm-bg grain-layer font-sans relative min-h-screen"
        style={{ color: "#1C1917" }}
      >
        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10 sm:py-7">
          <div className="fade-up flex items-center gap-3">
            <div
              className="relative flex h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "#1C1917" }}
            >
              <div
                className={`h-2 w-2 rounded-full ${running ? "breathe" : ""}`}
                style={{ backgroundColor: "#D4321C" }}
              ></div>
            </div>
            <div className="flex flex-col leading-tight">
              <span
                className="text-[10px] tracking-[0.35em] uppercase"
                style={{ color: "#8B7355" }}
              >
                Dens · 026
              </span>
              <span
                className="font-italic text-xl"
                style={{ letterSpacing: "-0.01em" }}
              >
                Workout Timer
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="fade-up fade-up-2 btn-lift flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm"
            style={{
              borderColor: "rgba(28,25,23,0.18)",
              backgroundColor: "rgba(245,240,229,0.5)",
            }}
          >
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Fine tune</span>
          </button>
        </header>

        {/* Main display */}
        <main
          className="relative z-10 flex flex-col items-center justify-center px-5 pb-12 pt-4 sm:pt-10"
          style={{ minHeight: "calc(100vh - 200px)" }}
        >
          {/* Status line */}
          <div className="fade-up fade-up-1 mb-4 flex items-center gap-3 sm:mb-6">
            <div
              className="h-px w-10"
              style={{ backgroundColor: "rgba(28,25,23,0.25)" }}
            ></div>
            <span
              className="text-[10px] tracking-[0.42em] uppercase"
              style={{ color: mode === "gap" ? "#D4321C" : "#6B5E4A" }}
            >
              {mode === "idle" && "ready to begin"}
              {mode === "pre" && "starting in"}
              {mode === "counting" && "in motion"}
              {mode === "gap" && "recover"}
              {mode === "done" && "session complete"}
            </span>
            <div
              className="h-px w-10"
              style={{ backgroundColor: "rgba(28,25,23,0.25)" }}
            ></div>
          </div>

          {/* The giant number */}
          <div
            key={`${displayNumber}-${mode}`}
            className="num-pop relative select-none leading-none"
            style={{
              fontSize: "clamp(8rem, 32vw, 22rem)",
              fontWeight: mode === "gap" ? 400 : 850,
              fontStyle: mode === "gap" ? "italic" : "normal",
              color: mode === "gap" ? "#D4321C" : "#1C1917",
              fontFamily:
                mode === "gap"
                  ? "'Instrument Serif', serif"
                  : "'Fraunces', serif",
              letterSpacing: "-0.055em",
              fontVariationSettings:
                mode === "gap"
                  ? "'opsz' 144"
                  : "'opsz' 144, 'SOFT' 30, 'WONK' 0",
            }}
          >
            {displayNumber}
          </div>

          {/* Sub label */}
          <div className="fade-up fade-up-2 mt-1 flex h-10 items-center sm:mt-3">
            <span
              className="font-italic text-xl sm:text-2xl"
              style={{ color: "#6B5E4A" }}
            >
              {mode === "idle" && "press play to begin"}
              {mode === "pre" && "take a breath"}
              {mode === "counting" &&
                `of ${countDirection === "up" ? endNum : startNum}`}
              {mode === "gap" && "seconds of rest"}
              {mode === "done" && "great work."}
            </span>
          </div>

          {/* Progress bar */}
          <div className="fade-up fade-up-3 mt-12 w-full max-w-2xl sm:mt-16">
            <div
              className="mb-2 flex items-center justify-between text-[10px] tracking-[0.3em] uppercase"
              style={{ color: "#8B7355" }}
            >
              <span>rep {String(startNum).padStart(2, "0")}</span>
              <span className="font-sans">{Math.round(progress * 100)}%</span>
              <span>rep {String(endNum).padStart(2, "0")}</span>
            </div>
            <div
              className="relative h-1.5 w-full overflow-hidden rounded-full"
              style={{ backgroundColor: "rgba(28,25,23,0.08)" }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                style={{
                  width: `${progress * 100}%`,
                  backgroundColor: mode === "gap" ? "#D4321C" : "#1C1917",
                }}
              ></div>
            </div>
            <div className="mt-1.5 flex w-full justify-between">
              {Array.from({ length: segmentCount + 1 }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 w-px"
                  style={{
                    backgroundColor:
                      progress * segmentCount >= i
                        ? "rgba(212,50,28,0.55)"
                        : "rgba(28,25,23,0.18)",
                  }}
                ></div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="fade-up fade-up-4 mt-10 flex items-center gap-5 sm:mt-14 sm:gap-6">
            <button
              onClick={handleReset}
              aria-label="Reset"
              className="btn-lift flex h-14 w-14 items-center justify-center rounded-full border"
              style={{
                borderColor: "rgba(28,25,23,0.2)",
                backgroundColor: "rgba(245,240,229,0.4)",
              }}
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={running ? handlePause : handlePlay}
              aria-label={running ? "Pause" : "Play"}
              className="btn-lift relative flex items-center justify-center rounded-full"
              style={{
                width: "84px",
                height: "84px",
                backgroundColor: "#1C1917",
                color: "#EFE8DB",
                boxShadow: "0 10px 30px rgba(28,25,23,0.25)",
              }}
            >
              {running ? (
                <Pause className="h-7 w-7" fill="#EFE8DB" />
              ) : (
                <Play className="ml-1 h-7 w-7" fill="#EFE8DB" />
              )}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              className="btn-lift flex h-14 w-14 items-center justify-center rounded-full border"
              style={{
                borderColor: "rgba(28,25,23,0.2)",
                backgroundColor: "rgba(245,240,229,0.4)",
              }}
            >
              <Settings2 className="h-5 w-5" />
            </button>
          </div>
        </main>

        {/* Footer summary */}
        <footer
          className="relative z-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 pb-8 text-[10px] tracking-[0.28em] uppercase sm:gap-x-8"
          style={{ color: "#8B7355" }}
        >
          <div className="flex items-center gap-2">
            <Gauge className="h-3.5 w-3.5" />
            <span>{countInterval.toFixed(1)}s per count</span>
          </div>
          <div
            className="hidden h-3 w-px sm:block"
            style={{ backgroundColor: "rgba(28,25,23,0.2)" }}
          ></div>
          <div className="flex items-center gap-2">
            <Timer className="h-3.5 w-3.5" />
            <span>{gapDuration.toFixed(1)}s rest</span>
          </div>
          <div
            className="hidden h-3 w-px sm:block"
            style={{ backgroundColor: "rgba(28,25,23,0.2)" }}
          ></div>
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5" />
            <span>every {gapEvery}</span>
          </div>
          <div
            className="hidden h-3 w-px sm:block"
            style={{ backgroundColor: "rgba(28,25,23,0.2)" }}
          ></div>
          <div className="flex items-center gap-2">
            {countDirection === "up" ? (
              <ArrowUp className="h-3.5 w-3.5" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5" />
            )}
            <span>
              {startNum} to {endNum}
            </span>
          </div>
        </footer>

        {/* Settings overlay */}
        {showSettings && (
          <>
            <div
              className="backdrop-in fixed inset-0 z-40"
              style={{
                backgroundColor: "rgba(28,25,23,0.35)",
                backdropFilter: "blur(3px)",
                WebkitBackdropFilter: "blur(3px)",
              }}
              onClick={() => setShowSettings(false)}
            ></div>
            <aside
              className="drawer-in hide-scrollbar fixed right-0 top-0 bottom-0 z-50 w-full max-w-md overflow-y-auto"
              style={{
                backgroundColor: "#F5F0E5",
                boxShadow: "-20px 0 60px rgba(28,25,23,0.15)",
              }}
            >
              <div
                className="sticky top-0 z-10 flex items-center justify-between border-b px-6 py-5"
                style={{
                  borderColor: "rgba(28,25,23,0.08)",
                  backgroundColor: "rgba(245,240,229,0.95)",
                  backdropFilter: "blur(6px)",
                }}
              >
                <div>
                  <div
                    className="text-[10px] tracking-[0.35em] uppercase"
                    style={{ color: "#8B7355" }}
                  >
                    adjust
                  </div>
                  <h2 className="font-italic text-2xl leading-tight">
                    Fine tune
                  </h2>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="rounded-full p-2 transition hover:bg-black/5"
                  aria-label="Close settings"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-10 px-6 py-8 pb-16">
                {/* Presets */}
                <Section
                  title="Presets"
                  icon={<Zap className="h-3.5 w-3.5" />}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <PresetButton
                      name="Standard"
                      desc="1→100 · 1.0s · 3s rest"
                      onClick={() => applyPreset("standard")}
                    />
                    <PresetButton
                      name="Fast burn"
                      desc="1→100 · 0.6s · 2s rest"
                      onClick={() => applyPreset("fast")}
                    />
                    <PresetButton
                      name="Slow build"
                      desc="1→50 · 2.0s · 5s rest"
                      onClick={() => applyPreset("slow")}
                    />
                    <PresetButton
                      name="HIIT"
                      desc="1→40 · 10s rest per 20"
                      onClick={() => applyPreset("hiit")}
                    />
                    <PresetButton
                      name="Tabata"
                      desc="20 reps · 10s rest"
                      onClick={() => applyPreset("tabata")}
                    />
                    <PresetButton
                      name="Continuous"
                      desc="No rest · 1→100"
                      onClick={() => applyPreset("continuous")}
                    />
                  </div>
                </Section>

                {/* Range */}
                <Section
                  title="Range"
                  icon={<Target className="h-3.5 w-3.5" />}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Start"
                      value={startNum}
                      onChange={setStartNum}
                      min={0}
                      max={999}
                    />
                    <NumberField
                      label="End"
                      value={endNum}
                      onChange={setEndNum}
                      min={1}
                      max={999}
                    />
                  </div>
                  <SegmentedControl
                    label="Direction"
                    options={[
                      {
                        value: "up",
                        label: "Count up",
                        icon: <ArrowUp className="h-3.5 w-3.5" />,
                      },
                      {
                        value: "down",
                        label: "Count down",
                        icon: <ArrowDown className="h-3.5 w-3.5" />,
                      },
                    ]}
                    value={countDirection}
                    onChange={(v) => {
                      setCountDirection(v);
                      setCurrent(v === "up" ? startNum : endNum);
                    }}
                  />
                </Section>

                {/* Timing */}
                <Section
                  title="Timing"
                  icon={<Gauge className="h-3.5 w-3.5" />}
                >
                  <RangeField
                    label="Count interval"
                    value={countInterval}
                    onChange={setCountInterval}
                    min={0.3}
                    max={5}
                    step={0.1}
                    format={(v) => `${v.toFixed(1)}s`}
                  />
                  <RangeField
                    label="Rest after every"
                    value={gapEvery}
                    onChange={setGapEvery}
                    min={1}
                    max={50}
                    step={1}
                    format={(v) => `${v} reps`}
                  />
                  <RangeField
                    label="Rest duration"
                    value={gapDuration}
                    onChange={setGapDuration}
                    min={0}
                    max={30}
                    step={0.5}
                    format={(v) => `${v.toFixed(1)}s`}
                  />
                  <RangeField
                    label="Pre-start countdown"
                    value={preCountdownLen}
                    onChange={(v) => {
                      setPreCountdownLen(v);
                      setPreValue(v);
                    }}
                    min={0}
                    max={10}
                    step={1}
                    format={(v) => (v === 0 ? "off" : `${v}s`)}
                  />
                </Section>

                {/* Voice */}
                <Section
                  title="Voice"
                  icon={<Mic2 className="h-3.5 w-3.5" />}
                >
                  <div>
                    <label
                      className="mb-2 block text-[10px] tracking-[0.28em] uppercase"
                      style={{ color: "#8B7355" }}
                    >
                      Voice selection
                    </label>
                    <select
                      value={voiceIdx}
                      onChange={(e) => setVoiceIdx(Number(e.target.value))}
                      className="brand-select w-full rounded-lg border px-3 py-2.5 pr-8 text-sm"
                      style={{
                        borderColor: "rgba(28,25,23,0.18)",
                        backgroundColor: "#EFE8DB",
                        color: "#1C1917",
                      }}
                    >
                      {voices.length === 0 && <option>Loading voices…</option>}
                      {voices.map((v, i) => (
                        <option key={i} value={i}>
                          {v.name} · {v.lang}
                        </option>
                      ))}
                    </select>
                    <p
                      className="mt-1.5 text-[11px]"
                      style={{ color: "#8B7355" }}
                    >
                      Filtered to likely male voices. Availability varies by
                      device.
                    </p>
                  </div>
                  <RangeField
                    label="Speech rate"
                    value={voiceRate}
                    onChange={setVoiceRate}
                    min={0.5}
                    max={2}
                    step={0.05}
                    format={(v) => `${v.toFixed(2)}x`}
                  />
                  <RangeField
                    label="Pitch"
                    value={voicePitch}
                    onChange={setVoicePitch}
                    min={0.5}
                    max={2}
                    step={0.05}
                    format={(v) => v.toFixed(2)}
                  />
                  <RangeField
                    label="Volume"
                    value={voiceVolume}
                    onChange={setVoiceVolume}
                    min={0}
                    max={1}
                    step={0.05}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                  <button
                    onClick={() => speak("One. Two. Three. Ready to work.")}
                    className="btn-lift flex w-full items-center justify-center gap-2 rounded-full border py-3 text-sm"
                    style={{
                      borderColor: "rgba(28,25,23,0.18)",
                      backgroundColor: "#EFE8DB",
                    }}
                  >
                    <Volume2 className="h-4 w-4" />
                    Test voice
                  </button>
                </Section>

                {/* Options */}
                <Section
                  title="Options"
                  icon={<Check className="h-3.5 w-3.5" />}
                >
                  <SwitchRow
                    label="Pre-countdown"
                    description="Speak 3, 2, 1 before starting"
                    value={preCountdown}
                    onChange={setPreCountdown}
                  />
                  <SwitchRow
                    label="Announce rest"
                    description="Say rest at each gap"
                    value={announceRest}
                    onChange={setAnnounceRest}
                  />
                </Section>

                <div className="pt-4 text-center">
                  <p
                    className="font-italic text-lg"
                    style={{ color: "#8B7355" }}
                  >
                    change what you need,
                  </p>
                  <p
                    className="font-italic text-lg"
                    style={{ color: "#8B7355" }}
                  >
                    keep what serves you.
                  </p>
                </div>
              </div>
            </aside>
          </>
        )}
      </div>
    </>
  );
}

/* ---------- Subcomponents ---------- */

function Section({ title, icon, children }) {
  return (
    <section>
      <div
        className="mb-4 flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase"
        style={{ color: "#8B7355" }}
      >
        {icon}
        <span>{title}</span>
        <div
          className="ml-1 h-px flex-1"
          style={{ backgroundColor: "rgba(28,25,23,0.1)" }}
        ></div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function RangeField({ label, value, onChange, min, max, step, format }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-sm" style={{ color: "#1C1917" }}>
          {label}
        </label>
        <span className="font-italic text-lg" style={{ color: "#D4321C" }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        className="brand-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div
        className="mt-1 flex justify-between text-[10px] tracking-wider"
        style={{ color: "#8B7355" }}
      >
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, min, max }) {
  return (
    <div>
      <label
        className="mb-2 block text-[10px] tracking-[0.28em] uppercase"
        style={{ color: "#8B7355" }}
      >
        {label}
      </label>
      <div
        className="flex items-center rounded-lg border"
        style={{
          borderColor: "rgba(28,25,23,0.18)",
          backgroundColor: "#EFE8DB",
        }}
      >
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-11 w-11 items-center justify-center text-lg transition hover:bg-black/5"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          className="h-11 w-full bg-transparent text-center text-lg font-medium outline-none"
          style={{ color: "#1C1917" }}
        />
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-11 w-11 items-center justify-center text-lg transition hover:bg-black/5"
        >
          +
        </button>
      </div>
    </div>
  );
}

function SegmentedControl({ label, options, value, onChange }) {
  return (
    <div>
      <label
        className="mb-2 block text-[10px] tracking-[0.28em] uppercase"
        style={{ color: "#8B7355" }}
      >
        {label}
      </label>
      <div
        className="grid grid-cols-2 gap-1 rounded-lg p-1"
        style={{ backgroundColor: "rgba(28,25,23,0.06)" }}
      >
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="flex items-center justify-center gap-2 rounded-md py-2 text-sm transition"
            style={{
              backgroundColor: value === o.value ? "#1C1917" : "transparent",
              color: value === o.value ? "#EFE8DB" : "#1C1917",
            }}
          >
            {o.icon}
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SwitchRow({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <div className="text-sm" style={{ color: "#1C1917" }}>
          {label}
        </div>
        <div className="text-xs" style={{ color: "#8B7355" }}>
          {description}
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative h-7 w-12 shrink-0 rounded-full transition"
        style={{
          backgroundColor: value ? "#1C1917" : "rgba(28,25,23,0.18)",
        }}
        aria-pressed={value}
      >
        <div
          className="absolute top-1 h-5 w-5 rounded-full transition-all"
          style={{
            left: value ? "24px" : "4px",
            backgroundColor: value ? "#D4321C" : "#F5F0E5",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        ></div>
      </button>
    </div>
  );
}

function PresetButton({ name, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="btn-lift group rounded-lg border px-3 py-3 text-left transition"
      style={{
        borderColor: "rgba(28,25,23,0.15)",
        backgroundColor: "#EFE8DB",
      }}
    >
      <div className="text-sm font-medium" style={{ color: "#1C1917" }}>
        {name}
      </div>
      <div
        className="mt-0.5 text-[10px] tracking-wider"
        style={{ color: "#8B7355" }}
      >
        {desc}
      </div>
    </button>
  );
}
