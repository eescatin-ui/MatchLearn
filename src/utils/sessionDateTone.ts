import { StudySessionRecord } from '../services/api/schedule';

export type SessionDateTone = 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'purple' | 'gray';

export const sessionDateToneColors: Record<SessionDateTone, { background: string; foreground: string }> = {
  blue: { background: '#dbeafe', foreground: '#1d4ed8' },
  green: { background: '#dcfce7', foreground: '#15803d' },
  yellow: { background: '#fef9c3', foreground: '#a16207' },
  orange: { background: '#ffedd5', foreground: '#c2410c' },
  red: { background: '#fee2e2', foreground: '#b91c1c' },
  purple: { background: '#f3e8ff', foreground: '#7e22ce' },
  gray: { background: '#f1f5f9', foreground: '#64748b' },
};

export const getSessionDateTone = (session: StudySessionRecord, now = new Date()): SessionDateTone => {
  if (session.status === 'completed') return 'gray';

  const startsAt = new Date(session.starts_at);
  const endsAt = session.ends_at ? new Date(session.ends_at) : startsAt;
  if (session.is_past || endsAt.getTime() < now.getTime()) return 'purple';

  const todayOrdinal = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const sessionOrdinal = Date.UTC(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate());
  const daysUntil = Math.round((sessionOrdinal - todayOrdinal) / 86400000);

  if (daysUntil <= 0) return 'red';
  if (daysUntil <= 3) return 'orange';
  if (daysUntil <= 7) return 'yellow';
  if (daysUntil < 14) return 'green';
  return 'blue';
};
