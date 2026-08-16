import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useCart } from '../context/CartContext';
import { useReservationDraft } from '../context/ReservationContext';
import { formatDate, upcomingDates, weekdayLabel } from '../lib/format';
import type { AvailabilitySlot, RestaurantInfo } from '../types';
import { OCCASION_LABELS } from '../types';
import { ErrorBanner, Loading, TopBar } from '../components/Chrome';

const STEPS = ['when', 'where', 'occasion', 'wishes', 'preorder', 'confirm'] as const;

export function ReservePage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const cart = useCart();
  const { draft, setDraft, fillDemoFriday } = useReservationDraft();
  const initial = STEPS.includes(params.get('step') as (typeof STEPS)[number])
    ? (params.get('step') as (typeof STEPS)[number])
    : 'when';
  const [step, setStepState] = useState<(typeof STEPS)[number]>(initial);

  function setStep(next: (typeof STEPS)[number]) {
    setStepState(next);
    setParams({ step: next }, { replace: true });
  }
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  useEffect(() => {
    api.getRestaurant().then(setRestaurant).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const next = params.get('step');
    if (next && STEPS.includes(next as (typeof STEPS)[number])) {
      setStepState(next as (typeof STEPS)[number]);
    }
  }, [params]);

  useEffect(() => {
    if (!draft.date || !draft.partySize) return;
    api
      .getAvailability({ date: draft.date, partySize: draft.partySize, diningAreaId: draft.diningAreaId })
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [draft.date, draft.partySize, draft.diningAreaId]);

  const selectedSlot = slots.find((slot) => slot.time === draft.startTime);
  const dates = useMemo(() => upcomingDates(12), []);

  if (loading || !restaurant) return <Loading />;

  async function confirm() {
    setSubmitting(true);
    setError('');
    setUnavailable(false);
    try {
      const reservation = await api.createReservation({
        date: draft.date,
        startTime: draft.startTime,
        partySize: draft.partySize,
        diningAreaId: draft.diningAreaId,
        occasion: draft.occasion,
        wishes: {
          highChair: draft.highChair,
          birthday: draft.birthday,
          quietTable: draft.quietTable,
          stroller: draft.stroller,
          comment: draft.comment,
        },
        preorder: draft.withPreorder && cart.lines.length ? cart.payload : undefined,
      });
      if (draft.withPreorder) cart.clear();
      navigate(`/reservations/${reservation.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'RESERVATION_SLOT_UNAVAILABLE') {
        setUnavailable(true);
        setError('На выбранное время мест нет.');
      } else {
        setError(err instanceof Error ? err.message : 'Не получилось создать бронь');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function joinWaitlist() {
    await api.joinWaitlist({
      date: draft.date,
      preferredTime: draft.startTime,
      partySize: draft.partySize,
      diningAreaId: draft.diningAreaId,
    });
    setWaitlisted(true);
  }

  return (
    <div className="page">
      <TopBar title="Бронь стола" back="/" />
      <button type="button" hidden data-demo-tour="fill-friday" onClick={() => {
        const terrace = restaurant.diningAreas.find((area) => area.slug === 'terrace');
        fillDemoFriday(terrace?.id ?? restaurant.diningAreas[1]?.id ?? 2);
        setStep('when');
      }}>
        demo fill
      </button>

      {step === 'when' && (
        <section data-demo-tour="reserve-when">
          <p className="eyebrow">Когда и сколько гостей</p>
          <h2>Выберите вечер</h2>
          <div className="chip-row">
            {dates.map((date) => (
              <button
                key={date}
                type="button"
                className={draft.date === date ? 'chip active' : 'chip'}
                onClick={() => setDraft({ date })}
              >
                {weekdayLabel(date)}
                <span>{formatDate(date)}</span>
              </button>
            ))}
          </div>
          <div className="party-row">
            <button type="button" className="btn btn-secondary" disabled={draft.partySize <= 1} onClick={() => setDraft({ partySize: draft.partySize - 1 })}>
              −
            </button>
            <strong>{draft.partySize} гостя</strong>
            <button type="button" className="btn btn-secondary" disabled={draft.partySize >= 12} onClick={() => setDraft({ partySize: draft.partySize + 1 })}>
              +
            </button>
          </div>
          <div className="slot-grid" data-demo-tour="reserve-slots">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                disabled={!slot.available}
                className={draft.startTime === slot.time ? 'slot active' : 'slot'}
                onClick={() => setDraft({ startTime: slot.time })}
              >
                {slot.time}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={() => setStep('where')}>
            Дальше
          </button>
        </section>
      )}

      {step === 'where' && (
        <section data-demo-tour="reserve-area">
          <p className="eyebrow">Зона</p>
          <h2>Где удобнее сесть?</h2>
          <button type="button" className={!draft.diningAreaId ? 'choice active' : 'choice'} onClick={() => setDraft({ diningAreaId: null })}>
            Без предпочтений
          </button>
          {restaurant.diningAreas.map((area) => (
            <button
              key={area.id}
              type="button"
              className={draft.diningAreaId === area.id ? 'choice active' : 'choice'}
              onClick={() => setDraft({ diningAreaId: area.id })}
            >
              <strong>{area.name}</strong>
              <span>{area.description}</span>
            </button>
          ))}
          <button type="button" className="btn btn-primary btn-block" onClick={() => setStep('occasion')}>
            Дальше
          </button>
        </section>
      )}

      {step === 'occasion' && (
        <section data-demo-tour="reserve-occasion">
          <p className="eyebrow">Повод</p>
          <h2>Зачем вы приходите?</h2>
          {Object.entries(OCCASION_LABELS).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={draft.occasion === id ? 'choice active' : 'choice'}
              onClick={() => setDraft({ occasion: id })}
            >
              {label}
            </button>
          ))}
          <button type="button" className="btn btn-primary btn-block" onClick={() => setStep('wishes')}>
            Дальше
          </button>
        </section>
      )}

      {step === 'wishes' && (
        <section>
          <p className="eyebrow">Пожелания</p>
          <h2>Что учесть?</h2>
          <label className="check"><input type="checkbox" checked={draft.highChair} onChange={(e) => setDraft({ highChair: e.target.checked })} /> Детский стул</label>
          <label className="check"><input type="checkbox" checked={draft.birthday} onChange={(e) => setDraft({ birthday: e.target.checked })} /> День рождения</label>
          <label className="check"><input type="checkbox" checked={draft.quietTable} onChange={(e) => setDraft({ quietTable: e.target.checked })} /> Тихий столик</label>
          <label className="check"><input type="checkbox" checked={draft.stroller} onChange={(e) => setDraft({ stroller: e.target.checked })} /> Место для коляски</label>
          <textarea
            placeholder="Комментарий для ресторана"
            value={draft.comment}
            onChange={(e) => setDraft({ comment: e.target.value })}
          />
          <button type="button" className="btn btn-primary btn-block" onClick={() => setStep('preorder')}>
            Дальше
          </button>
        </section>
      )}

      {step === 'preorder' && (
        <section data-demo-tour="reserve-preorder">
          <p className="eyebrow">Предзаказ</p>
          <h2>Хотите заказать что-нибудь заранее?</h2>
          <p className="lead">Закуски и напитки будут готовы к вашему приходу. Стол не обещаем заранее — его назначит ресторан.</p>
          <button type="button" className={draft.withPreorder ? 'choice active' : 'choice'} onClick={() => { setDraft({ withPreorder: true }); cart.setPurpose('preorder'); }}>
            Да, собрать предзаказ
          </button>
          <button type="button" className={!draft.withPreorder ? 'choice active' : 'choice'} onClick={() => setDraft({ withPreorder: false })}>
            Позже, уже в зале
          </button>
          {draft.withPreorder && (
            <Link className="btn btn-secondary btn-block" to="/menu?from=reserve">
              {cart.count ? `В корзине ${cart.count}` : 'Открыть меню'}
            </Link>
          )}
          <button type="button" className="btn btn-primary btn-block" onClick={() => setStep('confirm')}>
            К подтверждению
          </button>
        </section>
      )}

      {step === 'confirm' && (
        <section data-demo-tour="reserve-confirm">
          <p className="eyebrow">Подтверждение</p>
          <h2>Проверьте бронь</h2>
          <article className="summary-card">
            <p>{formatDate(draft.date)} · {draft.startTime}</p>
            <p>{draft.partySize} гостя · {restaurant.diningAreas.find((area) => area.id === draft.diningAreaId)?.name || 'Любая зона'}</p>
            <p>{OCCASION_LABELS[draft.occasion]}</p>
            {selectedSlot && !selectedSlot.available && <p className="warn">Этот слот уже занят — выберите другое время.</p>}
            {draft.withPreorder && cart.lines.length > 0 && (
              <div>
                <p className="eyebrow">Предзаказ</p>
                {cart.lines.map((line) => (
                  <p key={line.key}>{line.name} ×{line.quantity}</p>
                ))}
              </div>
            )}
          </article>
          {error && <ErrorBanner error={error} />}
          {unavailable && !waitlisted && (
            <button type="button" className="btn btn-secondary btn-block" onClick={() => void joinWaitlist()}>
              Встать в лист ожидания
            </button>
          )}
          {waitlisted && <p>Вы в листе ожидания. Мы предложим стол, если появится место.</p>}
          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={submitting}
            data-demo-tour="reserve-submit"
            onClick={() => void confirm()}
          >
            {submitting ? 'Создаём…' : 'Подтвердить бронь'}
          </button>
        </section>
      )}
    </div>
  );
}

