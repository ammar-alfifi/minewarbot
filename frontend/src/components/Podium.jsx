// منصة التتويج: أعلى ثلاثة لاعبين بأعمدة مرتفعة — تمنح لوحة الصدارة لحظة احتفالية.
import React from 'react';
import { short, num } from '../format.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Podium({ entries = [], renderAvatar, renderActions, scoreLabel = '' }) {
  if (!entries.length) return null;
  const top = entries.slice(0, 3);
  // ترتيب العرض الكلاسيكي: الثاني يسار، الأول وسط، الثالث يمين (بترتيب RTL يُعكس بصرياً).
  const columns = [top[1], top[0], top[2]];

  return (
    <div className="podium" role="list">
      {columns.map((entry, col) => {
        if (!entry) return <div key={`empty-${col}`} className="podium-col empty" aria-hidden="true" />;
        const rankIndex = top.indexOf(entry);
        return (
          <div key={entry.playerId} className={`podium-col place-${rankIndex + 1}`} role="listitem">
            {renderActions && <div className="podium-actions">{renderActions(entry)}</div>}
            <div className={`podium-avatar ${rankIndex === 0 ? 'is-first' : ''}`}>
              {renderAvatar ? renderAvatar(entry) : <span className="lb-avatar">{entry.regionEmoji || '⛏️'}</span>}
              <span className="podium-medal">{MEDALS[rankIndex]}</span>
            </div>
            <div className="podium-name" title={entry.name}>{entry.name}</div>
            <div className="podium-score">
              {short(entry.score)}
              {scoreLabel && <small>{scoreLabel}</small>}
            </div>
            <div className="podium-bar" />
          </div>
        );
      })}
    </div>
  );
}
