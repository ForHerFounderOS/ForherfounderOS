'use client';

import { serif, sans } from '@/lib/theme';
import type { ViewTask, ViewWorkstream } from '@/lib/model';

const badgeStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  color: '#8F5A12',
  background: '#F6E8CF',
  border: '1px solid #E8D3A8',
  padding: '2px 8px',
  borderRadius: 99,
  flexShrink: 0,
};

const waitingBadgeStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 600,
  color: '#7A6E60',
  background: '#F1EBE0',
  border: '1px solid #DDD2C1',
  padding: '2px 8px',
  borderRadius: 99,
  flexShrink: 0,
};

function TaskRow({ task, onSelect, onToggleDone }: { task: ViewTask; onSelect: () => void; onToggleDone?: (id: string) => void }) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '10px 4px',
        borderTop: '1px solid #F3EDE1',
        cursor: 'pointer',
        opacity: task.done || task.notYetActionable ? 0.65 : 1,
      }}
    >
      {!task.done && onToggleDone ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone(task.id);
          }}
          title="Mark done"
          style={{
            width: 19,
            height: 19,
            flexShrink: 0,
            marginTop: 1,
            borderRadius: 6,
            cursor: 'pointer',
            border: '1.5px solid #C4B7A5',
            background: 'transparent',
            padding: 0,
          }}
        />
      ) : (
        <span style={{ width: 19, height: 19, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A33757', fontSize: 13 }}>
          {task.done ? '✓' : ''}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: '#3A2F24', textDecoration: task.done ? 'line-through' : 'none' }}>
          {task.label}
        </div>
        {task.notYetActionable && task.notYetActionableLabel && (
          <div style={{ marginTop: 4 }}>
            <span style={waitingBadgeStyle}>{task.notYetActionableLabel}</span>
          </div>
        )}
        {!task.notYetActionable && task.deadlineLabel && (
          <div style={{ marginTop: 4 }}>
            <span style={badgeStyle}>{task.deadlineLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkstreamDetailModal({
  workstream,
  pillarName,
  pillarColor,
  onClose,
  onSelectTask,
  onToggleDone,
}: {
  workstream: ViewWorkstream;
  pillarName: string;
  pillarColor: string;
  onClose: () => void;
  onSelectTask: (task: ViewTask) => void;
  onToggleDone: (id: string) => void;
}) {
  const openTasks = workstream.tasks.filter((t) => !t.done && !t.notYetActionable);
  const waitingTasks = workstream.tasks.filter((t) => !t.done && t.notYetActionable);
  const doneTasks = workstream.tasks.filter((t) => t.done);

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
          maxWidth: 520,
          maxHeight: '84vh',
          overflowY: 'auto',
          background: '#FFFDF8',
          borderRadius: 18,
          padding: '30px 32px',
          boxShadow: '0 8px 24px rgba(43, 33, 24, 0.18), 0 30px 70px rgba(43, 33, 24, 0.28)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: pillarColor }} />
          <div style={{ fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A79A8A' }}>{pillarName}</div>
        </div>
        <div style={{ marginTop: 8, fontFamily: serif, fontSize: 23, lineHeight: 1.3, color: '#2B2118' }}>{workstream.name}</div>
        {workstream.description && (
          <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.55, color: '#5C5145' }}>{workstream.description}</div>
        )}

        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 6, borderRadius: 99, background: '#EFE8DB', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: pillarColor, width: `${workstream.pct}%` }} />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#5C5145' }}>{workstream.pct}%</span>
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A33757', marginBottom: 2 }}>
            Open · {openTasks.length}
          </div>
          {openTasks.length === 0 && <div style={{ padding: '10px 4px', fontSize: 13, color: '#A79A8A' }}>Nothing open right now.</div>}
          {openTasks.map((t) => (
            <TaskRow key={t.id} task={t} onSelect={() => onSelectTask(t)} onToggleDone={onToggleDone} />
          ))}
        </div>

        {waitingTasks.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A6E60', marginBottom: 2 }}>
              Waiting on Earliest Action Date · {waitingTasks.length}
            </div>
            {waitingTasks.map((t) => (
              <TaskRow key={t.id} task={t} onSelect={() => onSelectTask(t)} onToggleDone={onToggleDone} />
            ))}
          </div>
        )}

        {doneTasks.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4A5A3C', marginBottom: 2 }}>
              Done · {doneTasks.length}
            </div>
            {doneTasks.map((t) => (
              <TaskRow key={t.id} task={t} onSelect={() => onSelectTask(t)} onToggleDone={onToggleDone} />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
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
