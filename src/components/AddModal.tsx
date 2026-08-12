import React, { useState, useRef } from 'react';
import { X, Upload, Sun } from 'lucide-react';
import { DateMemory } from '../types';
import { compressImage } from '../utils/image';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memory: Omit<DateMemory, 'id' | 'createdAt'> & { id?: string }) => void;
  editData?: DateMemory | null;
}

export const AddModal: React.FC<AddModalProps> = ({ isOpen, onClose, onSave, editData }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [story, setStory] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [secretNote, setSecretNote] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (editData) {
        setTitle(editData.title);
        setDate(editData.date);
        setLocation(editData.location);
        setStory(editData.story);
        setPhotos(editData.photos);
        setSecretNote(editData.secretNote || '');
      } else {
        setTitle('');
        setDate(new Date().toISOString().split('T')[0]);
        setLocation('');
        setStory('');
        setPhotos([]);
        setSecretNote('');
      }
      setUrlInput('');
    }
  }, [isOpen, editData]);

  if (!isOpen) return null;

  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsCompressing(true);

    Promise.all(
      Array.from(files).map(async (file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = async (ev) => {
            try {
              if (ev.target?.result) {
                const compressed = await compressImage(ev.target.result as string);
                resolve(compressed);
              } else resolve('');
            } catch { resolve(''); }
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      })
    ).then((results) => {
      setPhotos((prev) => [...prev, ...results.filter((r) => r && r.length > 0)]);
      setIsCompressing(false);
    }).catch(() => {
      setIsCompressing(false);
    });
  };

  const handleAddUrl = () => {
    if (urlInput.trim()) {
      setPhotos((prev) => [...prev, urlInput.trim()]);
      setUrlInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    onSave({
      id: editData?.id,
      title: title.trim(),
      date,
      location: location.trim(),
      story: story.trim(),
      photos,
      secretNote: secretNote.trim() || undefined,
      isFavorite: editData?.isFavorite ?? false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md" style={{ animation: 'fade-up 0.3s ease-out both' }}>
      <div className="relative z-[70] bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-amber-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-lg font-semibold text-slate-800 font-serif flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            {editData ? 'Edit Date' : 'New Date'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
            <input
              type="text"
              required
              placeholder="Sunset picnic at the park"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
            />
          </div>

          {/* Date & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
              <input
                type="text"
                placeholder="Central Park"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
              />
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Photos</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                disabled={isCompressing}
                onClick={() => fileRef.current?.click()}
                className="px-3 py-2 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 hover:border-amber-400 hover:text-amber-500 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isCompressing ? 'Compressing...' : 'Upload'}</span>
              </button>
              <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
              <input
                type="text"
                placeholder="Or paste image URL..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddUrl())}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50"
              >
                Add
              </button>
            </div>

            {/* Photo thumbnails */}
            {photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((p, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 group">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Story */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Story</label>
            <textarea
              rows={4}
              placeholder="What made this date special..."
              value={story}
              onChange={(e) => setStory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white resize-none"
            />
          </div>

          {/* Secret Note */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Secret note <span className="text-slate-400 font-normal">(hidden until revealed)</span>
            </label>
            <input
              type="text"
              placeholder="A little hidden message..."
              value={secretNote}
              onChange={(e) => setSecretNote(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold transition-colors shadow-md shadow-amber-500/30"
          >
            {editData ? 'Save Changes' : 'Save Date'}
          </button>
        </form>
      </div>
    </div>
  );
};
