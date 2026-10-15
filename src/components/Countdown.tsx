import { useState, useEffect, type FC } from 'react'
import { Clock, Zap } from 'lucide-react'

interface CountdownProps {
  targetTimestamp: bigint
  onReady?: () => void
}

export const Countdown: FC<CountdownProps> = ({ targetTimestamp, onReady }) => {
  const targetMs = Number(targetTimestamp) * 1000
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isReady: boolean
  }>(calculateTimeLeft(targetMs))

  function calculateTimeLeft(target: number) {
    const diff = target - Date.now()
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isReady: true }
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
    const minutes = Math.floor((diff / (1000 * 60)) % 60)
    const seconds = Math.floor((diff / 1000) % 60)
    return { days, hours, minutes, seconds, isReady: false }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft(targetMs)
      setTimeLeft(remaining)
      if (remaining.isReady && onReady) {
        onReady()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [targetMs])

  if (timeLeft.isReady) {
    return (
      <span className="badge badge-ready font-mono">
        <Zap size={12} className="animate-spin" />
        Auto-Executing...
      </span>
    )
  }

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)

  return (
    <div className="countdown-pill font-mono" title={`Releases at ${new Date(targetMs).toLocaleString()} (${new Date(targetMs).toUTCString()})`}>
      <Clock size={13} className="text-gold" />
      <span className="countdown-label">Unlocks in:</span>
      <span className="countdown-time">
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {pad(timeLeft.hours)}h : {pad(timeLeft.minutes)}m : {pad(timeLeft.seconds)}s
      </span>
      <style>{`
        .countdown-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(245, 179, 0, 0.08);
          border: 1px solid rgba(245, 179, 0, 0.25);
          color: var(--gold-light);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 0.78rem;
          font-weight: 600;
        }
        .countdown-label {
          color: var(--text-dim);
          font-size: 0.72rem;
          text-transform: uppercase;
        }
        .countdown-time {
          color: var(--gold-primary);
          font-weight: 700;
        }
      `}</style>
    </div>
  )
}
