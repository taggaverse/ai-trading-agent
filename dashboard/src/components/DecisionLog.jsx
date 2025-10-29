import React from 'react'
import './DecisionLog.css'

export default function DecisionLog({ diary }) {
  if (!diary || !diary.decisions) return null

  const recentDecisions = diary.decisions.slice(-10).reverse()

  const getDecisionColor = (decision) => {
    if (decision === 'execute') return '#22c55e'
    if (decision === 'monitor') return '#f59e0b'
    return '#ef4444'
  }

  const getDecisionLabel = (decision) => {
    if (decision === 'execute') return '✓ Execute'
    if (decision === 'monitor') return '👁 Monitor'
    return '✕ Skip'
  }

  return (
    <div className="decision-log">
      <h3>Recent Decisions</h3>
      <div className="decisions-list">
        {recentDecisions.length > 0 ? (
          recentDecisions.map((decision, idx) => (
            <div key={idx} className="decision-item">
              <div className="decision-time">
                {new Date(decision.timestamp).toLocaleTimeString()}
              </div>
              <div className="decision-details">
                <span className="decision-symbol">{decision.opportunity}</span>
                <span className="decision-confidence">
                  Confidence: {(decision.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div 
                className="decision-action"
                style={{ borderLeftColor: getDecisionColor(decision.decision) }}
              >
                {getDecisionLabel(decision.decision)}
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">No decisions yet</p>
        )}
      </div>
    </div>
  )
}
