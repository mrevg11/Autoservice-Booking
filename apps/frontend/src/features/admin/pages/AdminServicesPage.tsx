import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  servicesApi, adminServicesApi,
  type ServiceCategory, type ServiceItem,
  type CreateCategoryPayload, type CreateServicePayload,
} from '../../../shared/api/endpoints';
import Button from '../../../shared/components/ui/Button';
import Input from '../../../shared/components/ui/Input';
import Spinner from '../../../shared/components/ui/Spinner';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import { toast } from '../../../shared/store/toast.store';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminServicesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'categories' | 'services'>('categories');
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingCat, setEditingCat] = useState<ServiceCategory | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);
  const [showSvcForm, setShowSvcForm] = useState(false);
  const [editingSvc, setEditingSvc] = useState<ServiceItem | null>(null);
  const [deleteSvcId, setDeleteSvcId] = useState<number | null>(null);

  const { data: categories = [], isLoading: lc } = useQuery({
    queryKey: ['categories'],
    queryFn: () => servicesApi.getCategories().then((r) => r.data),
  });

  const { data: services = [], isLoading: ls } = useQuery({
    queryKey: ['services-admin'],
    queryFn: () => adminServicesApi.getAllServices().then((r) => r.data),
  });

  const catForm = useForm<CreateCategoryPayload>();
  const svcForm = useForm<CreateServicePayload>();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['categories'] });
    qc.invalidateQueries({ queryKey: ['services-admin'] });
  };

  const createCat = useMutation({
    mutationFn: (d: CreateCategoryPayload) => adminServicesApi.createCategory(d),
    onSuccess: () => { toast('Категорію додано', 'success'); setShowCatForm(false); catForm.reset(); invalidate(); },
    onError: () => toast('Помилка', 'error'),
  });
  const updateCat = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateCategoryPayload> }) =>
      adminServicesApi.updateCategory(id, data),
    onSuccess: () => { toast('Збережено', 'success'); setEditingCat(null); catForm.reset(); invalidate(); },
    onError: () => toast('Помилка', 'error'),
  });
  const deleteCat = useMutation({
    mutationFn: (id: number) => adminServicesApi.deleteCategory(id),
    onSuccess: () => { toast('Видалено', 'success'); setDeleteCatId(null); invalidate(); },
    onError: () => toast('Помилка', 'error'),
  });

  const createSvc = useMutation({
    mutationFn: (d: CreateServicePayload) => adminServicesApi.createService(d),
    onSuccess: () => { toast('Послугу додано', 'success'); setShowSvcForm(false); svcForm.reset(); invalidate(); },
    onError: () => toast('Помилка', 'error'),
  });
  const updateSvc = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateServicePayload> & { isActive?: boolean } }) =>
      adminServicesApi.updateService(id, data),
    onSuccess: () => { toast('Збережено', 'success'); setEditingSvc(null); svcForm.reset(); invalidate(); },
    onError: () => toast('Помилка', 'error'),
  });
  const deleteSvc = useMutation({
    mutationFn: (id: number) => adminServicesApi.deleteService(id),
    onSuccess: () => { toast('Видалено', 'success'); setDeleteSvcId(null); invalidate(); },
    onError: () => toast('Помилка', 'error'),
  });

  const openEditCat = (cat: ServiceCategory) => {
    setEditingCat(cat);
    catForm.setValue('name', cat.name);
    catForm.setValue('description', cat.description ?? '');
  };
  const openEditSvc = (svc: ServiceItem) => {
    setEditingSvc(svc);
    svcForm.setValue('name', svc.name);
    svcForm.setValue('description', svc.description ?? '');
    svcForm.setValue('basePrice', Number(svc.basePrice));
    svcForm.setValue('baseDurationMinutes', svc.baseDurationMinutes);
    svcForm.setValue('categoryId', svc.category.id);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Послуги</h1>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([['categories', 'Категорії'], ['services', 'Послуги']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'categories' && (
        <div className="space-y-4">
          <Button size="sm" onClick={() => setShowCatForm(true)}>+ Додати категорію</Button>
          {lc ? <div className="flex justify-center py-8"><Spinner size="lg" /></div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat: ServiceCategory) => (
                <div key={cat.id} className="bg-white rounded-xl shadow-card border border-slate-100 p-5 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                    {cat.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{cat.description}</p>}
                    <p className="text-xs text-slate-400 mt-2">
                      {services.filter((s: ServiceItem) => s.category.id === cat.id).length} послуг
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEditCat(cat)} className="p-1.5 text-slate-400 hover:text-accent transition-colors">✏️</button>
                    <button onClick={() => setDeleteCatId(cat.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'services' && (
        <div className="space-y-4">
          <Button size="sm" onClick={() => setShowSvcForm(true)}>+ Додати послугу</Button>
          {ls ? <div className="flex justify-center py-8"><Spinner size="lg" /></div> : (
            <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {['Назва', 'Категорія', 'Ціна', 'Тривалість', 'Активна', 'Дії'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {services.map((svc: ServiceItem) => (
                    <tr key={svc.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{svc.name}</td>
                      <td className="px-4 py-3 text-slate-600">{svc.category.name}</td>
                      <td className="px-4 py-3">{Number(svc.basePrice).toLocaleString('uk-UA')} ₴</td>
                      <td className="px-4 py-3">{svc.baseDurationMinutes} хв</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => updateSvc.mutate({ id: svc.id, data: { isActive: !svc.isActive } })}
                          className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${svc.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          {svc.isActive ? 'Активна' : 'Неактивна'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => openEditSvc(svc)} className="p-1 text-slate-400 hover:text-accent transition-colors">✏️</button>
                          <button onClick={() => setDeleteSvcId(svc.id)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(showCatForm || editingCat) && (
        <Modal
          title={editingCat ? 'Редагувати категорію' : 'Нова категорія'}
          onClose={() => { setShowCatForm(false); setEditingCat(null); catForm.reset(); }}
        >
          <form
            onSubmit={catForm.handleSubmit((d) =>
              editingCat ? updateCat.mutate({ id: editingCat.id, data: d }) : createCat.mutate(d)
            )}
            className="space-y-3"
          >
            <Input label="Назва" {...catForm.register('name', { required: "Обов'язково" })} error={catForm.formState.errors.name?.message} />
            <Input label="Опис (необов'язково)" {...catForm.register('description')} />
            <div className="flex gap-2">
              <Button type="submit" isLoading={createCat.isPending || updateCat.isPending}>
                {editingCat ? 'Зберегти' : 'Додати'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setShowCatForm(false); setEditingCat(null); catForm.reset(); }}>
                Скасувати
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {(showSvcForm || editingSvc) && (
        <Modal
          title={editingSvc ? 'Редагувати послугу' : 'Нова послуга'}
          onClose={() => { setShowSvcForm(false); setEditingSvc(null); svcForm.reset(); }}
        >
          <form
            onSubmit={svcForm.handleSubmit((d) =>
              editingSvc ? updateSvc.mutate({ id: editingSvc.id, data: d }) : createSvc.mutate(d)
            )}
            className="space-y-3"
          >
            <div>
              <label className="text-sm font-medium text-slate-700">Категорія</label>
              <select
                className="mt-1 w-full h-10 border border-slate-200 rounded-xl px-3 text-sm focus:outline-none focus:border-accent"
                {...svcForm.register('categoryId', { required: true, valueAsNumber: true })}
              >
                <option value="">Оберіть...</option>
                {categories.map((c: ServiceCategory) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Input label="Назва" {...svcForm.register('name', { required: "Обов'язково" })} error={svcForm.formState.errors.name?.message} />
            <Input label="Опис (необов'язково)" {...svcForm.register('description')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Ціна (₴)" type="number" {...svcForm.register('basePrice', { required: true, valueAsNumber: true })} />
              <Input label="Тривалість (хв)" type="number" {...svcForm.register('baseDurationMinutes', { required: true, valueAsNumber: true })} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" isLoading={createSvc.isPending || updateSvc.isPending}>
                {editingSvc ? 'Зберегти' : 'Додати'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setShowSvcForm(false); setEditingSvc(null); svcForm.reset(); }}>
                Скасувати
              </Button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={deleteCatId !== null}
        title="Видалити категорію?"
        message="Всі послуги цієї категорії також будуть видалені."
        onConfirm={() => { if (deleteCatId !== null) deleteCat.mutate(deleteCatId); }}
        onCancel={() => setDeleteCatId(null)}
        isDanger
      />
      <ConfirmDialog
        isOpen={deleteSvcId !== null}
        title="Видалити послугу?"
        message="Цю дію не можна відмінити."
        onConfirm={() => { if (deleteSvcId !== null) deleteSvc.mutate(deleteSvcId); }}
        onCancel={() => setDeleteSvcId(null)}
        isDanger
      />
    </div>
  );
}
