import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPages, togglePageLike, SquareItem } from '../utils/api';
import { getStoredUser } from '../utils/storage';

export default function Square() {
  const navigate = useNavigate();
  const [items, setItems] = useState<SquareItem[]>([]);
  const [sort, setSort] = useState<'latest' | 'top'>('top');
  const [filter, setFilter] = useState<'public' | 'mine'>('public');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const currentUser = getStoredUser();

  const loadItems = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchPages(sort, filter);
      setItems(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Unauthorized')) {
      setError('Please sign in to view your pages.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [sort, filter]);

  const handleToggleLike = async (id: string) => {
    if (!currentUser) {
      setError('Please sign in to like.');
      return;
    }
    try {
      const result = await togglePageLike(id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                liked: result.liked,
                likes_count: result.likesCount,
              }
            : item
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Like failed');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="border-b border-[var(--border)] bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-5 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-base font-semibold text-[var(--ink)]"
          >
            Magic Brush
          </button>
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => navigate('/')}
              className="text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              Home
            </button>
            <button
              onClick={() => navigate('/square')}
              className="text-[var(--ink)] font-medium"
            >
              Square
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-semibold font-['Fraunces']">Square</h1>
            <p className="text-sm text-[var(--ink-muted)] mt-1">
              Explore public pages, sorted by latest or top likes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white p-1 text-xs">
              <button
                onClick={() => {
                  setSort('latest');
                  setFilter('public');
                }}
                className={`px-3 py-1 rounded-full ${
                  sort === 'latest' && filter === 'public'
                    ? 'bg-black/90 text-white'
                    : 'text-[var(--ink)]'
                }`}
              >
                Latest
              </button>
              <button
                onClick={() => {
                  setSort('top');
                  setFilter('public');
                }}
                className={`px-3 py-1 rounded-full ${
                  sort === 'top' && filter === 'public'
                    ? 'bg-black/90 text-white'
                    : 'text-[var(--ink)]'
                }`}
              >
                Top
              </button>
              <button
                onClick={() => {
                  setSort('latest');
                  setFilter('mine');
                }}
                className={`px-3 py-1 rounded-full ${
                  filter === 'mine'
                    ? 'bg-black/90 text-white'
                    : 'text-[var(--ink)]'
                }`}
              >
                Mine
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-[var(--paper-2)] border border-[var(--border)] rounded-xl text-sm">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-sm text-[var(--ink-muted)]">Loading...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/${item.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/${item.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
                className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm flex flex-col gap-3 text-left hover:border-black/30 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <p className="text-xs text-[var(--ink-muted)] mt-1">
                      by {item.owner_username}
                    </p>
                    <div className="mt-2">
                      <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--paper-2)] px-2 py-1 text-[11px] text-[var(--ink-muted)]">
                        {item.model || 'unknown'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLike(item.id);
                    }}
                    className="text-xs px-3 py-1 rounded-full border border-[var(--border)] hover:bg-[var(--paper-2)]"
                  >
                    {item.liked ? 'Liked' : 'Like'} · {item.likes_count}
                  </button>
                </div>
                <div className="text-xs text-[var(--ink-muted)]">
                  Updated {new Date(item.updated_at).toLocaleString()}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-sm text-[var(--ink-muted)]">
                {filter === 'mine'
                  ? 'You have not created any pages yet.'
                  : 'No public pages yet.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
