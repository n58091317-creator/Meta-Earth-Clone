import React from 'react'
import { Card } from 'antd'

interface LogPanelProps {
  logs: string[]
  onClear: () => void
}

export const LogPanel: React.FC<LogPanelProps> = ({ logs, onClear }) => {
  return (
    <Card title="Activity Log" extra={<a onClick={onClear}>Clear</a>} className="demo-section">
      <pre className="log-container">{logs.length === 0 ? 'No activity yet' : logs.join('\n')}</pre>
    </Card>
  )
}
