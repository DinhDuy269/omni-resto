import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Tag, Flame, ArrowRight, ChevronRight } from 'lucide-react';
import { apiClient } from '../../../shared/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Event {
  id: string;
  title: string;
  description: string;
  short_description: string;
  event_date: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  image_url?: string;
  price: number;
  max_capacity?: number;
  registered_count?: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  is_featured: boolean;
  tags?: string;
}

const STATUS_MAP = {
  upcoming: { label: 'Sắp diễn ra', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
  ongoing:  { label: 'Đang diễn ra', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
  completed:{ label: 'Đã kết thúc',  color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  cancelled:{ label: 'Đã hủy',       color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
};

function normalizeEvent(raw: Record<string, unknown>): Event {
  const eventDate = Array.isArray(raw.eventDate)
    ? (raw.eventDate as number[]).map((n, i) => i === 0 ? String(n) : String(n).padStart(2, '0')).join('-')
    : String(raw.eventDate ?? raw.event_date ?? '');

  const toTimeStr = (t: unknown) => {
    if (!t) return undefined;
    if (Array.isArray(t)) return (t as number[]).slice(0, 2).map((n) => String(n).padStart(2, '0')).join(':');
    return String(t);
  };

  return {
    id: String(raw.id),
    title: String(raw.title),
    description: String(raw.description ?? ''),
    short_description: String(raw.shortDescription ?? raw.short_description ?? ''),
    event_date: eventDate,
    start_time: toTimeStr(raw.startTime ?? raw.start_time),
    end_time: toTimeStr(raw.endTime ?? raw.end_time),
    location: (raw.location) ? String(raw.location) : undefined,
    image_url: (raw.imageUrl ?? raw.image_url) ? String(raw.imageUrl ?? raw.image_url) : undefined,
    price: Number(raw.price ?? 0),
    max_capacity: (raw.maxCapacity ?? raw.max_capacity) ? Number(raw.maxCapacity ?? raw.max_capacity) : undefined,
    registered_count: (raw.registeredCount ?? raw.registered_count) ? Number(raw.registeredCount ?? raw.registered_count) : undefined,
    status: (raw.status as Event['status']) || 'upcoming',
    is_featured: Boolean(raw.isFeatured ?? raw.is_featured),
    tags: raw.tags ? String(raw.tags) : undefined,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ClientEvents: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing'>('all');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data } = await apiClient.get<unknown[]>('/events');
        setEvents((data as Record<string, unknown>[]).map(normalizeEvent));
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const filtered = events.filter((e) => {
    if (filter === 'all') return e.status !== 'cancelled' && e.status !== 'completed';
    return e.status === filter;
  });

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('vi-VN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

  const formatPrice = (price: number) =>
    price === 0 ? 'Miễn phí' : price.toLocaleString('vi-VN') + 'đ/người';

  // ─── Event Detail Modal ─────────────────────────────────────────────────────
  if (selectedEvent) {
    const sc = STATUS_MAP[selectedEvent.status] ?? STATUS_MAP.upcoming;
    const availability = selectedEvent.max_capacity && selectedEvent.registered_count !== undefined
      ? Math.max(0, selectedEvent.max_capacity - selectedEvent.registered_count)
      : null;

    return (
      <div style={{ minHeight: '100vh', background: 'var(--c-bg)' }}>
        {/* Back */}
        <div style={{ background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', padding: '16px 24px' }}>
          <button
            onClick={() => setSelectedEvent(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--c-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9375rem' }}
          >
            ← Quay lại sự kiện
          </button>
        </div>

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 64px' }}>
          {/* Cover image */}
          {selectedEvent.image_url && (
            <div style={{ borderRadius: 'var(--c-r-xl)', overflow: 'hidden', marginBottom: 28, height: 320, position: 'relative' }}>
              <img
                src={selectedEvent.image_url}
                alt={selectedEvent.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
              <div style={{ position: 'absolute', bottom: 20, left: 24, right: 24 }}>
                <span style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: 'var(--c-r-full)',
                  fontSize: '0.8rem', fontWeight: 700, color: sc.color, background: sc.bg,
                  backdropFilter: 'blur(8px)', border: `1px solid ${sc.color}40`,
                }}>
                  {sc.label}
                </span>
              </div>
            </div>
          )}

          <div className="c-animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h1 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.75rem)', fontWeight: 900, color: 'var(--c-text-main)', margin: '0 0 12px', lineHeight: 1.3 }}>
                {selectedEvent.title}
              </h1>
              {selectedEvent.is_featured && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 'var(--c-r-full)', background: 'rgba(251,191,36,0.15)', color: '#d97706', fontSize: '0.8125rem', fontWeight: 700 }}>
                  <Flame size={13} /> Sự kiện nổi bật
                </span>
              )}
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { icon: <Calendar size={16} color="var(--c-primary)" />, label: 'Ngày', value: formatDate(selectedEvent.event_date) },
                selectedEvent.start_time ? { icon: <Clock size={16} color="var(--c-primary)" />, label: 'Giờ', value: `${selectedEvent.start_time}${selectedEvent.end_time ? ' – ' + selectedEvent.end_time : ''}` } : null,
                selectedEvent.location ? { icon: <MapPin size={16} color="var(--c-primary)" />, label: 'Địa điểm', value: selectedEvent.location } : null,
                availability !== null ? { icon: <Users size={16} color="var(--c-primary)" />, label: 'Còn chỗ', value: `${availability}/${selectedEvent.max_capacity} chỗ` } : null,
              ].filter(Boolean).map((item, i) => item && (
                <div key={i} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 'var(--c-r-lg)', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {item.icon}
                    <span style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--c-text-main)', fontSize: '0.9375rem' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Description */}
            <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 'var(--c-r-lg)', padding: '24px' }}>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--c-text-main)', margin: '0 0 12px' }}>Mô tả sự kiện</h2>
              <p style={{ color: 'var(--c-text-muted)', lineHeight: 1.75, fontSize: '0.9375rem', margin: 0 }}>
                {selectedEvent.description || selectedEvent.short_description}
              </p>
            </div>

            {/* Tags */}
            {selectedEvent.tags && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedEvent.tags.split(',').map((tag) => (
                  <span key={tag} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '5px 12px', borderRadius: 'var(--c-r-full)',
                    background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                    fontSize: '0.8125rem', color: 'var(--c-text-muted)',
                  }}>
                    <Tag size={11} />
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}

            {/* Price + CTA */}
            <div style={{
              background: 'var(--c-surface)', border: '1px solid var(--c-border)',
              borderRadius: 'var(--c-r-xl)', padding: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted)', marginBottom: 4 }}>Giá vé</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: selectedEvent.price === 0 ? '#16a34a' : 'var(--c-primary)' }}>
                  {formatPrice(selectedEvent.price)}
                </div>
              </div>
              <button
                className="c-btn c-btn-primary c-btn-lg"
                onClick={() => navigate('/client/menu')}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                Khám phá thực đơn
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Events List ──────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', fontFamily: 'var(--c-font)' }}>

      {/* Hero */}
      <section style={{ position: 'relative', height: 260, overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1400&auto=format&fit=crop&q=80"
          alt=""
          aria-hidden
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(18,8,2,0.85) 0%, rgba(18,8,2,0.5) 100%)' }} />
        <div style={{
          position: 'relative', zIndex: 1, height: '100%',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fbbf24', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            <Flame size={14} /> Sự Kiện & Khuyến Mãi
          </div>
          <h1 style={{ fontSize: 'clamp(1.625rem, 4vw, 2.5rem)', fontWeight: 900, color: '#fff', margin: 0, textAlign: 'center' }}>
            Sự Kiện OmniResto
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem', margin: 0, maxWidth: 480, textAlign: 'center' }}>
            Khám phá các buổi tiệc ẩm thực đặc sắc, workshops và ưu đãi độc quyền từ chuỗi nhà hàng OmniResto
          </p>
        </div>
      </section>

      {/* Filter tabs */}
      <div style={{ background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', padding: '0 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 0 }}>
          {[
            { id: 'all' as const, label: 'Tất cả' },
            { id: 'upcoming' as const, label: 'Sắp diễn ra' },
            { id: 'ongoing' as const, label: 'Đang diễn ra' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 600, transition: 'all 0.2s',
                color: filter === tab.id ? 'var(--c-primary)' : 'var(--c-text-muted)',
                borderBottom: `2.5px solid ${filter === tab.id ? 'var(--c-primary)' : 'transparent'}`,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '36px 24px 64px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--c-text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
            <div>Đang tải sự kiện...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--c-text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
            <div style={{ fontWeight: 600 }}>Không có sự kiện nào</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
            {filtered.map((event) => {
              const sc = STATUS_MAP[event.status] ?? STATUS_MAP.upcoming;
              const availability = event.max_capacity && event.registered_count !== undefined
                ? Math.max(0, event.max_capacity - event.registered_count)
                : null;

              return (
                <article
                  key={event.id}
                  className="c-animate-fade-up"
                  onClick={() => setSelectedEvent(event)}
                  style={{
                    background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                    borderRadius: 'var(--c-r-xl)', overflow: 'hidden', cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--c-shadow-lg)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'none';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  {/* Image */}
                  <div style={{ height: 200, position: 'relative', overflow: 'hidden' }}>
                    <img
                      src={event.image_url ?? 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop'}
                      alt={event.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.35s' }}
                    />
                    <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 'var(--c-r-full)',
                        fontSize: '0.75rem', fontWeight: 700, color: sc.color, background: 'rgba(255,255,255,0.9)',
                      }}>
                        {sc.label}
                      </span>
                      {event.is_featured && (
                        <span style={{
                          padding: '4px 10px', borderRadius: 'var(--c-r-full)',
                          fontSize: '0.75rem', fontWeight: 700, color: '#d97706', background: 'rgba(255,255,255,0.9)',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <Flame size={11} /> Nổi bật
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--c-text-main)', margin: '0 0 8px', lineHeight: 1.35 }}>
                      {event.title}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--c-text-muted)', margin: '0 0 16px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {event.short_description}
                    </p>

                    {/* Meta */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}>
                        <Calendar size={13} color="var(--c-primary)" />
                        {new Date(event.event_date + 'T00:00:00').toLocaleDateString('vi-VN', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' })}
                        {event.start_time && <span>· {event.start_time}</span>}
                      </div>
                      {event.location && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--c-text-muted)' }}>
                          <MapPin size={13} color="var(--c-primary)" />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer: price + availability */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--c-border-light)' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.0625rem', color: event.price === 0 ? '#16a34a' : 'var(--c-primary)' }}>
                          {formatPrice(event.price)}
                        </div>
                        {availability !== null && (
                          <div style={{ fontSize: '0.75rem', color: availability < 5 ? '#dc2626' : 'var(--c-text-muted)', marginTop: 2 }}>
                            {availability < 5 ? `⚠️ Còn ${availability} chỗ` : `${event.registered_count}/${event.max_capacity} đã đăng ký`}
                          </div>
                        )}
                      </div>
                      <button
                        className="c-btn c-btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.8125rem' }}
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                      >
                        Xem chi tiết <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientEvents;
