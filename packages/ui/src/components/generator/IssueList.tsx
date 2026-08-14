/**
 * IssueList — «что сломается в отчёте».
 *
 * Тексты берутся из ядра дословно: `message` — короткая суть, `consequence` —
 * последствие человеческими словами. Здесь ничего не переписываем, иначе форма
 * и помощник начнут говорить разное об одной и той же проблеме.
 */

import type { Issue } from '@utmka/core'

interface IssueListProps {
  issues: readonly Issue[]
  /** Показывается у чинимых замечаний. */
  onFix?: () => void
}

export function IssueList({ issues, onFix }: IssueListProps) {
  if (issues.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {issues.map((issue, index) => (
        <div key={`${issue.code}-${issue.field}-${index}`} className={`issue issue--${issue.level}`}>
          <span>
            <span className="issue-title">{issue.message}.</span>{' '}
            <span className="issue-text">{issue.consequence}</span>
          </span>
          {issue.fixable && onFix ? (
            <button type="button" className="issue-fix" onClick={onFix}>
              Чинить
            </button>
          ) : null}
        </div>
      ))}
    </div>
  )
}
