import { useRef, useState } from 'react';
import { useBookingPhotos, useAddBookingPhoto, useDeleteBookingPhoto } from '../hooks/useBookings';
import Button from '../../../shared/components/ui/Button';
import Spinner from '../../../shared/components/ui/Spinner';
import { toast } from '../../../shared/store/toast.store';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export default function BookingPhotosSection({
  bookingId,
  currentUserId,
}: {
  bookingId: number;
  currentUserId?: number;
}) {
  const { data: photos, isLoading } = useBookingPhotos(bookingId);
  const addPhoto = useAddBookingPhoto();
  const deletePhoto = useDeleteBookingPhoto();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('');
  const [caption, setCaption] = useState('');
  const [lightbox, setLightbox] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_BYTES) {
      toast('Файл занадто великий (максимум 5 МБ)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setMimeType(file.type);
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected after cancel
    e.target.value = '';
  };

  const handleUpload = () => {
    if (!preview) return;
    addPhoto.mutate(
      { bookingId, dataUrl: preview, mimeType, caption: caption.trim() || undefined },
      {
        onSuccess: () => {
          toast('Фото додано', 'success');
          setPreview(null);
          setCaption('');
          setMimeType('');
        },
        onError: () => toast('Помилка завантаження фото', 'error'),
      },
    );
  };

  const handleDelete = (photoId: number) => {
    deletePhoto.mutate(
      { bookingId, photoId },
      {
        onSuccess: () => toast('Фото видалено', 'success'),
        onError: () => toast('Помилка видалення', 'error'),
      },
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5">
      <h2 className="font-semibold text-slate-900 mb-4">Фотографії</h2>

      {/* Upload area */}
      {!preview ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-300 rounded-xl py-4 text-sm text-slate-500 hover:border-accent hover:text-accent transition-colors mb-4"
        >
          + Вибрати фото (JPG, PNG, до 5 МБ)
        </button>
      ) : (
        <div className="mb-4 space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <img
            src={preview}
            alt="preview"
            className="max-h-48 rounded-lg object-contain mx-auto border border-slate-200"
          />
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Підпис (необов'язково)"
            maxLength={200}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleUpload} isLoading={addPhoto.isPending}>
              Завантажити
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setPreview(null); setCaption(''); setMimeType(''); }}
            >
              Скасувати
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Photos grid */}
      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : !photos?.length ? (
        <p className="text-sm text-slate-400 text-center py-4">Фотографій ще немає</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group">
              <button
                className="block w-full"
                onClick={() => setLightbox(photo.dataUrl)}
              >
                <img
                  src={photo.dataUrl}
                  alt={photo.caption ?? 'фото'}
                  className="w-full h-28 object-cover rounded-lg border border-slate-200 hover:opacity-90 transition-opacity"
                />
              </button>
              {photo.caption && (
                <p className="text-xs text-slate-500 mt-1 truncate">{photo.caption}</p>
              )}
              <p className="text-xs text-slate-400">
                {photo.uploadedBy
                  ? `${photo.uploadedBy.firstName} ${photo.uploadedBy.lastName}`
                  : ''}
              </p>
              {(photo.uploadedBy?.id === currentUserId) && (
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center leading-none"
                  title="Видалити фото"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="full"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-2xl font-bold leading-none hover:text-slate-300"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
