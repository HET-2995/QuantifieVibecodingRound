'use client';

import { Tone } from '@/types';

interface ToneSelectorProps {
  tone: Tone;
  onChange: (tone: Tone) => void;
  disabled?: boolean;
}

const tones: { value: Tone; label: string; emoji: string; description: string }[] = [
  { value: 'professional', label: 'Professional', emoji: '💼', description: 'Formal & structured' },
  { value: 'casual', label: 'Casual', emoji: '😊', description: 'Friendly & relaxed' },
  { value: 'concise', label: 'Concise', emoji: '⚡', description: 'Short & direct' },
];

export default function ToneSelector({ tone, onChange, disabled = false }: ToneSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-zinc-800 rounded-xl p-1">
      {tones.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          disabled={disabled}
          title={t.description}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            tone === t.value
              ? 'bg-accent text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
          }`}
        >
          <span>{t.emoji}</span>
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
