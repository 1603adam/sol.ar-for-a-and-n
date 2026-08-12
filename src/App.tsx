import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Sun,
  Plus,
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Lock
} from 'lucide-react';
import { DateMemory, CoupleInfo } from './types';
import { AddModal } from './components/AddModal';

// ─── localStorage helpers ────────────────────────────────────
const STORAGE_KEYS = {
  memories: 'adam_nurin_memories',
  couple: 'adam_nurin_couple',
};

function loadMemories(): DateMemory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.memories);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadCouple(): CoupleInfo {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.couple);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { partner1: 'Adam', partner2: 'Nurin', startDate: '' };
}

// ─── Day counter ──────────────────────────────────────────────
function getDaysTogether(startDate: string): number {
  if (!startDate) return 0;
  const start = new Date(startDate).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const [memories, setMemories] = useState<DateMemory[]>(loadMemories);
  const [couple, setCouple] = useState<CoupleInfo>(loadCouple);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DateMemory | null>(null);
  const [viewTarget, setViewTarget] = useState<DateMemory | null>(null);
  const [viewPhotoIdx, setViewPhotoIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [days, setDays] = useState(() => getDaysTogether(loadCouple().startDate));

  // Persist memories
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.memories, JSON.stringify(memories));
  }, [memories]);

  // Persist couple info
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.couple, JSON.stringify(couple));
  }, [couple]);

  // Live day counter
  useEffect(() => {
    const update = () => setDays(getDaysTogether(couple.startDate));
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [couple.startDate]);

  // Sorted memories (newest first)
  const sorted = [...memories].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ─── Handlers ─────────────────────────────────────────────
  const handleSave = useCallback((data: Omit<DateMemory, 'id' | 'createdAt'> & { id?: string }) => {
    if (data.id) {
      setMemories((prev) => prev.map((m) => (m.id === data.id ? { ...m, ...data } : m)));
    } else {
      const newMem: DateMemory = {
        ...data,
        id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
      };
      setMemories((prev) => [newMem, ...prev]);
      try {
        confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 }, colors: ['#fbbf24', '#f97316', '#fde68a'] });
      } catch {}
    }
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (confirm('Delete this date memory?')) {
      setMemories((prev) => prev.filter((m) => m.id !== id));
      if (viewTarget?.id === id) setViewTarget(null);
    }
  }, [viewTarget]);

  const handleToggleFav = useCallback((id: string) => {
    setMemories((prev) => prev.map((m) => (m.id === id ? { ...m, isFavorite: !m.isFavorite } : m)));
  }, []);

  // Export / Import
  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ couple, memories }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adam_nurin_dates_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.memories) setMemories(parsed.memories);
        if (parsed.couple) setCouple(parsed.couple);
      } catch { alert('Invalid file.'); }
    };
    reader.readAsText(file);
  };

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen sun-backdrop bg-dots relative">
      {/* Giant rotating sun rays backdrop */}
      <SunBackdrop />
      {/* Floating sun sparkles */}
      <FloatingHearts />

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-white/70 border-b border-amber-100/70">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sun className="w-6 h-6 text-amber-500 animate-spin-slow" strokeWidth={2.2} />
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400 bg-clip-text text-transparent">
                SOL.AR
              </span>
              <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                {couple.partner1} &amp; {couple.partner2}
              </span>
            </div>
            {days > 0 && (
              <span className="text-xs text-amber-600 font-medium ml-0.5">
                · {days} days
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
              title="Settings"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setEditTarget(null); setIsAddOpen(true); }}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm shadow-amber-500/30"
            >
              <Plus className="w-3.5 h-3.5" /> Add Date
            </button>
          </div>
        </div>

        {/* Settings dropdown */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-amber-100/50"
            >
              <div className="max-w-2xl mx-auto px-4 py-3 space-y-3">
                {/* Couple info */}
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={couple.partner1}
                    onChange={(e) => setCouple({ ...couple, partner1: e.target.value })}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300 bg-white"
                    placeholder="Your name"
                  />
                  <input
                    type="text"
                    value={couple.partner2}
                    onChange={(e) => setCouple({ ...couple, partner2: e.target.value })}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300 bg-white"
                    placeholder="Partner name"
                  />
                  <input
                    type="date"
                    value={couple.startDate}
                    onChange={(e) => setCouple({ ...couple, startDate: e.target.value })}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-rose-300 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleExport} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-1">
                    <Download className="w-3 h-3" /> Export
                  </button>
                  <label className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer">
                    <Upload className="w-3 h-3" /> Import
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main content */}
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-20">
        {sorted.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-white flex items-center justify-center mx-auto mb-4 animate-sun-glow">
              <Sun className="w-10 h-10 animate-spin-slow" strokeWidth={2} />
            </div>
            <h2 className="font-serif text-3xl text-slate-700 mb-2">
              Let the sun shine on your memories
            </h2>
            <p className="text-sm text-slate-400 mb-6 max-w-xs mx-auto">
              Start saving your special dates together under the SOL.AR
            </p>
            <button
              onClick={() => { setEditTarget(null); setIsAddOpen(true); }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold transition-colors inline-flex items-center gap-2 shadow-md shadow-amber-500/30"
            >
              <Plus className="w-4 h-4" /> Add First Date
            </button>
          </motion.div>
        ) : (
          /* Memory list */
          <div className="space-y-4">
            {sorted.map((mem, i) => (
              <MemoryCard
                key={mem.id}
                memory={mem}
                index={i}
                onEdit={() => { setEditTarget(mem); setIsAddOpen(true); }}
                onDelete={() => handleDelete(mem.id)}
                onToggleFav={() => handleToggleFav(mem.id)}
                onView={() => { setViewTarget(mem); setViewPhotoIdx(0); }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 space-y-1.5 relative z-10">
        <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          made with warmth for {couple.partner1} &amp; {couple.partner2}
        </p>
        <p className="text-xs text-slate-400 font-medium">
          © Adam Iskandar 2026
        </p>
      </footer>

      {/* Add/Edit Modal */}
      <AddModal
        isOpen={isAddOpen}
        onClose={() => { setIsAddOpen(false); setEditTarget(null); }}
        onSave={handleSave}
        editData={editTarget}
      />

      {/* Detail View Modal */}
      <AnimatePresence>
        {viewTarget && (
          <DetailView
            memory={viewTarget}
            photoIdx={viewPhotoIdx}
            setPhotoIdx={setViewPhotoIdx}
            onClose={() => setViewTarget(null)}
            onEdit={() => { setViewTarget(null); setEditTarget(viewTarget); setIsAddOpen(true); }}
            onDelete={() => { setViewTarget(null); handleDelete(viewTarget.id); }}
            onToggleFav={() => handleToggleFav(viewTarget.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Memory Card ──────────────────────────────────────────────
function MemoryCard({
  memory,
  index,
  onEdit,
  onDelete,
  onToggleFav,
  onView,
}: {
  memory: DateMemory;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFav: () => void;
  onView: () => void;
}) {
  const dateStr = new Date(memory.date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="bg-white/85 backdrop-blur-sm rounded-2xl border border-amber-100/90 overflow-hidden hover:shadow-lg hover:shadow-amber-100/50 transition-shadow group"
    >
      {/* Photo row */}
      {memory.photos.length > 0 && (
        <div
          onClick={onView}
          className="flex gap-1 overflow-x-auto cursor-pointer"
        >
          {memory.photos.slice(0, 3).map((p, i) => (
            <div key={i} className="relative flex-1 min-w-0 h-48 first:rounded-tl-2xl last:rounded-tr-2xl">
              <img src={p} alt="" className="w-full h-full object-cover" loading="lazy" />
              {memory.photos.length > 3 && i === 2 && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white text-sm font-medium">
                  +{memory.photos.length - 3}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            <h3
              onClick={onView}
              className="font-serif text-lg font-semibold text-slate-800 hover:text-amber-600 cursor-pointer transition-colors truncate"
            >
              {memory.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-500" />
                {dateStr}
              </span>
              {memory.location && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                  {memory.location}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onToggleFav} className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors">
              <Sun className={`w-4 h-4 ${memory.isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`} />
            </button>
            <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile: always show fav */}
          <button
            onClick={onToggleFav}
            className="p-1.5 rounded-lg group-hover:hidden sm:hidden"
          >
            <Sun className={`w-4 h-4 ${memory.isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`} />
          </button>
        </div>

        {/* Story preview */}
        {memory.story && (
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
            {memory.story}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Detail View ──────────────────────────────────────────────
function DetailView({
  memory,
  photoIdx,
  setPhotoIdx,
  onClose,
  onEdit,
  onDelete,
  onToggleFav,
}: {
  memory: DateMemory;
  photoIdx: number;
  setPhotoIdx: (i: number) => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFav: () => void;
}) {
  const photos = memory.photos.length > 0 ? memory.photos : [];
  const [secretRevealed, setSecretRevealed] = useState(false);
  const dateStr = new Date(memory.date).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleRevealSecret = () => {
    setSecretRevealed(true);
    try {
      confetti({ particleCount: 20, spread: 50, origin: { y: 0.8 }, colors: ['#fbbf24', '#fde68a'] });
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Photo gallery */}
        {photos.length > 0 && (
          <div className="relative aspect-[4/3] bg-slate-950">
            <img
              src={photos[photoIdx % photos.length]}
              alt=""
              className="w-full h-full object-contain"
            />
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIdx((photoIdx - 1 + photos.length) % photos.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-amber-500 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPhotoIdx((photoIdx + 1) % photos.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-amber-500 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === photoIdx % photos.length ? 'bg-amber-400 w-5' : 'bg-white/50'}`}
                    />
                  ))}
                </div>
              </>
            )}
            {/* Close */}
            <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-3">
          {/* No photo header close btn */}
          {photos.length === 0 && (
            <div className="flex items-center justify-between">
              <span />
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-semibold text-slate-800">
                {memory.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-500" /> {dateStr}
                </span>
                {memory.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-500" /> {memory.location}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onToggleFav} className="p-1.5 rounded-lg hover:bg-amber-50">
                <Sun className={`w-5 h-5 ${memory.isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`} />
              </button>
            </div>
          </div>

          {memory.story && (
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {memory.story}
            </p>
          )}

          {/* Secret note */}
          {memory.secretNote && (
            <div className="pt-2">
              {!secretRevealed ? (
                <button
                  onClick={handleRevealSecret}
                  className="w-full p-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/50 text-xs text-slate-500 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> Tap to reveal secret note
                </button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3 rounded-xl bg-amber-50 border border-amber-100"
                >
                  <p className="text-xs text-slate-600 font-script text-base italic">
                    "{memory.secretNote}"
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={onEdit}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={onDelete}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto px-5 pb-4">
            {photos.map((p, i) => (
              <button
                key={i}
                onClick={() => setPhotoIdx(i)}
                className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${i === photoIdx % photos.length ? 'border-rose-500' : 'border-transparent opacity-50'}`}
              >
                <img src={p} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Big rotating sun rays in the top corner ─────────────────
function SunBackdrop() {
  return (
    <div className="fixed -top-24 -right-24 sm:-top-20 sm:-right-16 pointer-events-none z-0 opacity-60">
      <div className="relative w-72 h-72">
        {/* Soft glow core */}
        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-yellow-200 to-orange-300 blur-2xl" />
        {/* Rotating rays */}
        <svg viewBox="0 0 200 200" className="w-full h-full animate-spin-slow text-amber-300/70">
          {Array.from({ length: 16 }).map((_, i) => (
            <rect
              key={i}
              x="98"
              y="6"
              width="4"
              height="34"
              rx="2"
              fill="currentColor"
              transform={`rotate(${i * 22.5} 100 100)`}
            />
          ))}
          <circle cx="100" cy="100" r="34" className="fill-amber-300/80" />
        </svg>
      </div>
    </div>
  );
}

// ─── Floating sun sparkles (CSS-based, lightweight) ──────────
function FloatingHearts() {
  const [sparkles, setSparkles] = useState<{ id: number; x: number; delay: number; size: number }[]>([]);

  useEffect(() => {
    const iv = setInterval(() => {
      setSparkles((prev) => {
        const next = [
          ...prev,
          {
            id: Date.now() + Math.random(),
            x: Math.random() * 100,
            delay: Math.random() * 2,
            size: 10 + Math.random() * 12,
          },
        ];
        return next.slice(-8);
      });
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const clean = setInterval(() => {
      setSparkles((prev) => (prev.length > 5 ? prev.slice(-5) : prev));
    }, 5000);
    return () => clearInterval(clean);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {sparkles.map((s) => (
        <div
          key={s.id}
          className="absolute animate-float-up text-amber-300/50"
          style={{
            left: `${s.x}%`,
            bottom: '-20px',
            animationDelay: `${s.delay}s`,
            fontSize: `${s.size}px`,
          }}
        >
          ☀
        </div>
      ))}
    </div>
  );
}
