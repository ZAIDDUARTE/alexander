"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ApprovedVoiceEntry } from "@/lib/onboarding/approvedVoiceCatalog";

let activeAudio: HTMLAudioElement | null = null;

function stopActiveAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
}

export function VoicePreviewCard({
  voice,
  selected,
  onSelect,
  name,
}: {
  voice: ApprovedVoiceEntry;
  selected: boolean;
  onSelect: () => void;
  name: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const labelId = useId();
  const hasPreview = Boolean(voice.previewSrc);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio && activeAudio === audio) {
        stopActiveAudio();
      }
    };
  }, []);

  const togglePlay = () => {
    if (!voice.previewSrc || !audioRef.current) return;
    const audio = audioRef.current;
    if (playing) {
      audio.pause();
      setPlaying(false);
      if (activeAudio === audio) activeAudio = null;
      return;
    }
    stopActiveAudio();
    activeAudio = audio;
    void audio.play();
    setPlaying(true);
  };

  return (
    <li
      className={`min-w-0 rounded-lg border p-4 transition-colors ${
        selected
          ? "border-[var(--color-alexander-blue)] bg-[var(--color-alexander-info-bg)]"
          : "border-[var(--color-alexander-border)] bg-white"
      }`}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <label className="flex min-w-0 cursor-pointer items-start gap-3">
          <input
            type="radio"
            name={name}
            value={voice.id}
            checked={selected}
            onChange={onSelect}
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-alexander-blue)]"
            aria-labelledby={labelId}
          />
          <span id={labelId} className="min-w-0">
            <span className="block text-sm font-semibold text-[var(--color-alexander-navy)]">
              {voice.label}
            </span>
            <span className="block text-sm text-[var(--color-alexander-muted)]">
              {voice.description}
            </span>
          </span>
        </label>
        <div className="shrink-0 sm:max-w-[14rem] sm:text-right">
          {hasPreview ? (
            <div className="space-y-1">
              <audio
                ref={audioRef}
                src={voice.previewSrc!}
                preload="metadata"
                onLoadedMetadata={() => {
                  if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
                    setDuration(audioRef.current.duration);
                  }
                }}
                onEnded={() => {
                  setPlaying(false);
                  if (activeAudio === audioRef.current) activeAudio = null;
                }}
                className="sr-only"
                aria-label={`Preview ${voice.label}`}
              />
              <button
                type="button"
                onClick={togglePlay}
                className="rounded-lg border border-[var(--color-alexander-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-alexander-navy)] hover:border-[var(--color-alexander-blue)]/40 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-alexander-blue)]"
              >
                {playing ? "Pause preview" : "Play preview"}
              </button>
              {duration !== null && (
                <p className="text-xs text-[var(--color-alexander-muted)]" aria-live="polite">
                  Duration: {Math.round(duration)}s
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-alexander-muted)]" aria-hidden={false}>
              Preview coming soon
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
