import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { servicesApi, ServiceItem } from '../../../shared/api/endpoints';
import Input from '../../../shared/components/ui/Input';
import Spinner from '../../../shared/components/ui/Spinner';
import EmptyState from '../../../shared/components/ui/EmptyState';
import Pagination from '../../../shared/components/ui/Pagination';
import { useAuth } from '../../../shared/hooks/useAuth';

function ServiceCard({ service }: { service: ServiceItem }) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-white rounded-xl shadow-card border border-slate-100 p-5 flex flex-col gap-3 hover:border-accent/30 transition-colors">
      <div>
        <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full">
          {service.category.name}
        </span>
      </div>
      <h3 className="font-semibold text-slate-900">{service.name}</h3>
      {service.description && (
        <p className="text-sm text-slate-500 line-clamp-2">{service.description}</p>
      )}
      <div className="flex items-center gap-4 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{Number(service.basePrice).toLocaleString('uk-UA')} грн</span>
        <span className="text-slate-400">·</span>
        <span>{service.baseDurationMinutes} хв</span>
      </div>
      {isAuthenticated() ? (
        <Link
          to={`/client/bookings/new?serviceId=${service.id}`}
          className="mt-auto inline-flex items-center justify-center px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent-hover transition-colors"
        >
          Записатися
        </Link>
      ) : (
        <Link
          to="/login"
          className="mt-auto inline-flex items-center justify-center px-4 py-2 border border-accent text-accent text-sm font-medium rounded-lg hover:bg-accent/5 transition-colors"
        >
          Записатися
        </Link>
      )}
    </div>
  );
}

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => servicesApi.getCategories().then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['services', { categoryId, search: debouncedSearch, page }],
    queryFn: () =>
      servicesApi.getServices({ categoryId, search: debouncedSearch || undefined, page, limit: 9, isActive: true })
        .then((r) => r.data),
  });

  const totalPages = data ? Math.ceil(data.total / 9) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Послуги</h1>
        <Input
          placeholder="Пошук послуги..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="sm:w-64"
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setSearchParams({}); setPage(1); }}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            ${!categoryId ? 'bg-accent text-white' : 'bg-white border border-slate-300 text-slate-600 hover:border-accent'}`}
        >
          Усі
        </button>
        {(categories ?? []).map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setSearchParams({ categoryId: String(cat.id) }); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${categoryId === cat.id ? 'bg-accent text-white' : 'bg-white border border-slate-300 text-slate-600 hover:border-accent'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : data?.data.length === 0 ? (
        <EmptyState title="Послуг не знайдено" description="Спробуйте змінити фільтри" icon="🔍" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.data.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
