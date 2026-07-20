'use client';

import { serif, sans } from '@/lib/theme';
import type { ViewTask } from '@/lib/model';
import { formatLongDate } from '@/lib/dateFormat';

function formattedDeadline(iso: string | null): string {
  if (!iso) return '';
  return formatLongDate(new Date(iso + 'T00:00:00'));
}

export default function TaskDetailModal({
  task,
  onClose,
  onToggleDone,
}: {
  task: ViewTask;
  onClose: () => void;
  onToggleDone?: (id: string) => void;
}) {
  const whyItMatters =
    task.workstreamDescription ||
    (task.workstreamName ? `Part of ${task.workstreamName}, under ${task.pillarName}.` : `Filed under ${task.pillarName}.`);

  const whatItsBlocking = task.done
    ? 'Already done — nothing waiting on this one anymore.'
    : task.isNext
    ? task.workstreamName
      ? `This is what's holding ${task.workstreamName} up — nothing else in it moves until this does.`
      : "This is what's next — nothing else moves until this does."
    : task.blockedByLabel
    ? `Not the holdup yet — “${task.blockedByLabel}” is what's next in ${task.workstreamName}. This one's queued behind it.`
    : 'Queued, not urgent — nothing downstream is waiting on this one yet.';

  const deadlineText = task.deadline
    ? task.overdue
      ? `Was due ${formattedDeadline(task.deadline)} — it’s overdue.`
      : `Due ${formattedDeadline(task.deadline)}.`
    : 'No deadline set — this one moves on its own time.';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(43, 33, 24, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fcc-fade-up"
        style={{
          width: '100%',
          maxWidth: 480,
          background: '#FFFDF8',
          borderRadius: 18,
          padding: '30px 32px',
          boxShadow: '0 8px 24px rgba(43, 33, 24, 0.18), 0 30px 70px rgba(43, 33, 24, 0.28)',
        }}
      >
        <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A' }}>
          {task.pillarName}
          {task.workstreamName ? ` · ${task.workstreamName}` : ''}
        </div>
        <div style={{ marginTop: 8, fontFamily: serif, fontSize: 23, lineHeight: 1.3, color: '#2B2118' }}>{task.label}</div>

        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A33757', marginBottom: 5 }}>
              Why it matters
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: '#3A2F24' }}>{whyItMatters}</div>
          </div>

          <div>
            <div style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A4F79', marginBottom: 5 }}>
              What it&rsquo;s blocking
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: '#3A2F24' }}>{whatItsBlocking}</div>
          </div>

          <div>
            <div
              style={{
                fontSize: 10.5,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: task.overdue ? '#A24E2E' : '#4A5A3C',
                marginBottom: 5,
              }}
            >
              Deadline
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: '#3A2F24' }}>{deadlineText}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
          {!task.done && onToggleDone && (
            <button
              onClick={() => {
                onToggleDone(task.id);
                onClose();
              }}
              style={{
                border: 'none',
                cursor: 'pointer',
                background: '#A33757',
                color: '#FFF3EC',
                fontFamily: sans,
                fontSize: 13.5,
                fontWeight: 600,
                padding: '10px 18px',
                borderRadius: 9,
              }}
            >
              Mark done
            </button>
          )}
          {task.done && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12.5,
                fontWeight: 600,
                color: '#4A5A3C',
                background: '#EEF0E6',
                padding: '9px 16px',
                borderRadius: 9,
              }}
            >
              ✓ Done
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              border: '1px solid #DDD2C1',
              cursor: 'pointer',
              background: 'transparent',
              color: '#7A6E60',
              fontFamily: sans,
              fontSize: 13.5,
              padding: '10px 18px',
              borderRadius: 9,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
