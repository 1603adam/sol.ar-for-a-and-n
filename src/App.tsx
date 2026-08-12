import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { db, auth, SECRET_KEY } from './firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const MEMORIES_COL = 'memories';
const COUPLE_DOC = 'couple';

const DEFAULT_COUPLE: CoupleInfo = {
  partner1: 'Adam',
  partner2: 'Nurin',
  startDate: '',
};

function getDaysTogether(startDate: string): number {
  if (!startDate) return 0;
  const start = new Date(startDate).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24)));
}

export default function App() {
  const [memories, setMemories] = useState<DateMemory[]>([]);
  const [couple, setCouple] = useState<CoupleInfo>(DEFAULT_COUPLE);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DateMemory | null>(null);
  const [viewTarget, setViewTarget] = useState<DateMemory | null>(null);
  const [viewPhotoIdx, setViewPhotoIdx] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [days, setDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cloud sync
  useEffect(() => {
    let unsubMemories: (() => void) | undefined;
    let unsubCouple: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          await signInAnonymously(auth);
          return;
        }

        setIsAuthed(true);
        setErrorMsg('');

        // Match the Firestore security rule with a constrained query.
        // Reading the whole collection would be rejected before client filtering.
        unsubMemories = onSnapshot(
          query(
            collection(db, MEMORIES_COL),
            where('secretKey', '==', SECRET_KEY)
          ),
          (snapshot) => {
            const data: DateMemory[] = [];
            snapshot.forEach((d) => {
              const m = d.data() as DateMemory & { secretKey?: string };
              data.push({
                id: m.id || d.id,
                title: m.title || 'Untitled',
                date: m.date || '',
                location: m.location || '',
                photos: Array.isArray(m.photos) ? m.photos : [],
                story: m.story || '',
                secretNote: m.secretNote,
                isFavorite: !!m.isFavorite,
                createdAt: m.createdAt || Date.now(),
              });
            });
            setMemories(data);
            setIsLoading(false);
          },
          (err) => {
            console.error(err);
            setErrorMsg(`Could not load memories (${err.code || 'permission-denied'}). Check Firebase Auth + Rules.`);
            setIsLoading(false);
          }
        );

        // Add the key first. This also upgrades an older couple document
        // that was created before the private rules were enabled.
        const coupleRef = doc(db, 'settings', COUPLE_DOC);
        setDoc(coupleRef, { secretKey: SECRET_KEY }, { merge: true })
          .then(() => {
            unsubCouple = onSnapshot(
              coupleRef,
              (snap) => {
                if (!snap.exists()) return;
                const d = snap.data() as CoupleInfo;
                setCouple({
                  partner1: d.partner1 || 'Adam',
                  partner2: d.partner2 || 'Nurin',
                  startDate: d.startDate || '',
                });
              },
              (err) => {
                console.error(err);
                setErrorMsg(`Could not load couple settings (${err.code || 'permission-denied'}).`);
              }
            );
          })
          .catch((err) => {
            console.error(err);
            setErrorMsg(`Could not initialize settings (${err.code || 'permission-denied'}).`);
          });
      } catch (err) {
        console.error(err);
        setErrorMsg('Authentication failed. Enable Anonymous sign-in in Firebase.');
        setIsLoading(false);
      }
    });

    // Kick off anonymous auth
    signInAnonymously(auth).catch((err) => {
      console.error(err);
      setErrorMsg('Enable Anonymous Authentication in Firebase Console.');
      setIsLoading(false);
    });

    return () => {
      unsubAuth();
      unsubMemories?.();
      unsubCouple?.();
    };
  }, []);

  useEffect(() => {
    const update = () => setDays(getDaysTogether(couple.startDate));
    update();
    const iv = setInterval(update, 60000);
    return () => clearInterval(iv);
  }, [couple.startDate]);

  const sorted = useMemo(
    () =>
      [...memories].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [memories]
  );

  const handleSave = useCallback(
    async (data: Omit<DateMemory, 'id' | 'createdAt'> & { id?: string }) => {
      try {
        const id = data.id || `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        // Strip undefined fields (Firestore rejects undefined)
        const payload: Record<string, unknown> = {
          id,
          title: data.title,
          date: data.date,
          location: data.location || '',
          photos: data.photos || [],
          story: data.story || '',
          isFavorite: data.isFavorite ?? false,
          secretKey: SECRET_KEY,
          createdAt: Date.now(),
        };
        if (data.secretNote) payload.secretNote = data.secretNote;

        await setDoc(doc(db, MEMORIES_COL, id), payload);

        if (!data.id) {
          try {
            confetti({
              particleCount: 40,
              spread: 60,
              origin: { y: 0.7 },
              colors: ['#fbbf24', '#f97316', '#fde68a'],
            });
          } catch {}
        }
      } catch (err) {
        console.error(err);
        alert('Failed to save. Please check your internet connection and Firebase rules.');
      }
    },
    []
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Delete this date memory?')) return;
      try {
        await deleteDoc(doc(db, MEMORIES_COL, id));
        if (viewTarget?.id === id) setViewTarget(null);
      } catch (err) {
        console.error(err);
        alert('Failed to delete.');
      }
    },
    [viewTarget]
  );

  const handleToggleFav = useCallback(async (id: string, currentFav: boolean) => {
    try {
      await setDoc(
        doc(db, MEMORIES_COL, id),
        { isFavorite: !currentFav, secretKey: SECRET_KEY },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
    }
  }, []);

  const updateCouple = async (newCouple: CoupleInfo) => {
    setCouple(newCouple); // optimistic UI
    try {
      await setDoc(doc(db, 'settings', COUPLE_DOC), {
        ...newCouple,
        secretKey: SECRET_KEY,
      });
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ couple, memories }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOLAR_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.memories) {
          for (const mem of parsed.memories) {
            await setDoc(doc(db, MEMORIES_COL, mem.id), {
              ...mem,
              secretKey: SECRET_KEY,
            });
          }
        }
        if (parsed.couple) {
          await updateCouple(parsed.couple);
        }
      } catch {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  const openAdd = () => {
    setEditTarget(null);
    setIsAddOpen(true);
  };

  return (
    <div className="min-h-screen sun-backdrop bg-dots relative">
      <SunBackdrop />
      <FloatingSparkles />

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
              <span className="text-xs text-amber-600 font-medium ml-0.5">· {days} days</span>
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
              onClick={openAdd}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm shadow-amber-500/30"
            >
              <Plus className="w-3.5 h-3.5" /> Add Date
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-amber-100/50"
            >
              <div className="max-w-2xl mx-auto px-4 py-3 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={couple.partner1}
                    onChange={(e) => updateCouple({ ...couple, partner1: e.target.value })}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300 bg-white"
                    placeholder="Your name"
                  />
                  <input
                    type="text"
                    value={couple.partner2}
                    onChange={(e) => updateCouple({ ...couple, partner2: e.target.value })}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300 bg-white"
                    placeholder="Partner name"
                  />
                  <input
                    type="date"
                    value={couple.startDate}
                    onChange={(e) => updateCouple({ ...couple, startDate: e.target.value })}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-amber-300 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExport}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Export Backup
                  </button>
                  <label className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer">
                    <Upload className="w-3 h-3" /> Import Backup
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                </div>
                <p className="text-[10px] text-amber-600/70 pt-1">
                  All data is synced in real-time across devices via the cloud.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-20 relative z-10">
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">
            {errorMsg}
          </div>
        )}

        {!isAuthed || isLoading ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-white flex items-center justify-center mx-auto mb-4 animate-sun-glow">
              <Sun className="w-8 h-8 animate-spin-slow" strokeWidth={2} />
            </div>
            <p className="text-amber-600 font-serif text-lg">Connecting to the cloud...</p>
          </div>
        ) : sorted.length === 0 ? (
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
              onClick={openAdd}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold transition-colors inline-flex items-center gap-2 shadow-md shadow-amber-500/30"
            >
              <Plus className="w-4 h-4" /> Add First Date
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {sorted.map((mem, i) => (
              <MemoryCard
                key={mem.id}
                memory={mem}
                index={i}
                onEdit={() => {
                  setEditTarget(mem);
                  setIsAddOpen(true);
                }}
                onDelete={() => handleDelete(mem.id)}
                onToggleFav={() => handleToggleFav(mem.id, mem.isFavorite)}
                onView={() => {
                  setViewTarget(mem);
                  setViewPhotoIdx(0);
                }}
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
        <p className="text-xs text-slate-400 font-medium">© Adam Iskandar 2026</p>
      </footer>

      {/* Add Modal — always mounted, controlled by isOpen */}
      <AddModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setEditTarget(null);
        }}
        onSave={handleSave}
        editData={editTarget}
      />

      {/* Detail View */}
      <AnimatePresence>
        {viewTarget && (
          <DetailView
            memory={viewTarget}
            photoIdx={viewPhotoIdx}
            setPhotoIdx={setViewPhotoIdx}
            onClose={() => setViewTarget(null)}
            onEdit={() => {
              setViewTarget(null);
              setEditTarget(viewTarget);
              setIsAddOpen(true);
            }}
            onDelete={() => {
              setViewTarget(null);
              handleDelete(viewTarget.id);
            }}
            onToggleFav={() => handleToggleFav(viewTarget.id, viewTarget.isFavorite)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Memory Card ─────────────────────────────────────────────
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
  const photos = memory.photos || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.3 }}
      className="bg-white/85 backdrop-blur-sm rounded-2xl border border-amber-100/90 overflow-hidden hover:shadow-lg hover:shadow-amber-100/50 transition-shadow group"
    >
      {photos.length > 0 && (
        <div onClick={onView} className="flex gap-1 overflow-x-auto cursor-pointer">
          {photos.slice(0, 3).map((p, i) => (
            <div
              key={i}
              className="relative flex-1 min-w-0 h-48 first:rounded-tl-2xl last:rounded-tr-2xl"
            >
              <img src={p} alt="" className="w-full h-full object-cover" loading="lazy" />
              {photos.length > 3 && i === 2 && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-white text-sm font-medium">
                  +{photos.length - 3}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

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
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onToggleFav} className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors">
              <Sun
                className={`w-4 h-4 ${memory.isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`}
              />
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={onToggleFav} className="p-1.5 rounded-lg sm:hidden">
            <Sun
              className={`w-4 h-4 ${memory.isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`}
            />
          </button>
        </div>
        {memory.story && (
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{memory.story}</p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Detail View ─────────────────────────────────────────────
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
  const photos = memory.photos || [];
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
      confetti({
        particleCount: 20,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#fbbf24', '#fde68a'],
      });
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
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
                  {photos.map((_: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === photoIdx % photos.length ? 'bg-amber-400 w-5' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="p-5 space-y-3">
          {photos.length === 0 && (
            <div className="flex items-center justify-between">
              <span />
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl font-semibold text-slate-800">{memory.title}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-500" />
                  {dateStr}
                </span>
                {memory.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-500" />
                    {memory.location}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onToggleFav} className="p-1.5 rounded-lg hover:bg-amber-50">
              <Sun
                className={`w-5 h-5 ${memory.isFavorite ? 'text-amber-500 fill-amber-400' : 'text-slate-300'}`}
              />
            </button>
          </div>

          {memory.story && (
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {memory.story}
            </p>
          )}

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
                  <p className="text-slate-600 font-script text-base italic">
                    "{memory.secretNote}"
                  </p>
                </motion.div>
              )}
            </div>
          )}

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

        {photos.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto px-5 pb-4">
            {photos.map((p, i) => (
              <button
                key={i}
                onClick={() => setPhotoIdx(i)}
                className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                  i === photoIdx % photos.length ? 'border-amber-500' : 'border-transparent opacity-50'
                }`}
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

// ─── Sun Backdrop ────────────────────────────────────────────
function SunBackdrop() {
  return (
    <div className="fixed -top-24 -right-24 sm:-top-20 sm:-right-16 pointer-events-none z-0 opacity-60">
      <div className="relative w-72 h-72">
        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-yellow-200 to-orange-300 blur-2xl" />
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

// ─── Floating Sparkles ───────────────────────────────────────
function FloatingSparkles() {
  const [sparkles, setSparkles] = useState<
    { id: number; x: number; delay: number; size: number }[]
  >([]);

  useEffect(() => {
    const iv = setInterval(() => {
      setSparkles((prev) =>
        [
          ...prev,
          {
            id: Date.now() + Math.random(),
            x: Math.random() * 100,
            delay: Math.random() * 2,
            size: 10 + Math.random() * 12,
          },
        ].slice(-8)
      );
    }, 3000);
    return () => clearInterval(iv);
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
