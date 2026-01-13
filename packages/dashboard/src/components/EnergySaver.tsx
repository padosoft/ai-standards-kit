/**
 * Energy Saver Screen - Fineco Style
 *
 * Mostra una schermata di risparmio energetico dopo un periodo di inattivita
 * o quando l'utente cambia tab. Si disattiva al movimento del mouse.
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useEnergySaverStore } from '@/stores/app'

interface EnergySaverProps {
  idleTimeout?: number // ms di inattivita prima di attivare (default: 2 minuti)
  title?: string
  description?: string
  logoText?: string
}

export function EnergySaver({
  idleTimeout = 120000,
  title = 'Risparmio energetico',
  description = 'Questa schermata permette di ridurre il consumo di energia del monitor quando non lo utilizzi. Muovi il mouse per continuare a navigare nel sito.',
  logoText = 'AI ORCHESTRATOR',
}: EnergySaverProps) {
  const { enabled } = useEnergySaverStore()
  const [isActive, setIsActive] = useState(false)
  const [isHiding, setIsHiding] = useState(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    idleTimerRef.current = setTimeout(() => {
      setIsActive(true)
    }, idleTimeout)
  }, [idleTimeout])

  const resetTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
    }
    if (!isActive) {
      startIdleTimer()
    }
  }, [isActive, startIdleTimer])

  const hideOverlay = useCallback(() => {
    if (!isActive || isHiding) return

    setIsHiding(true)

    setTimeout(() => {
      setIsActive(false)
      setIsHiding(false)
      startIdleTimer()
    }, 1500)
  }, [isActive, isHiding, startIdleTimer])

  useEffect(() => {
    if (!enabled) {
      setIsActive(false)
      setIsHiding(false)
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
      return
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true })
    })

    const handleVisibilityChange = () => {
      if (document.hidden && enabled) {
        setIsActive(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    startIdleTimer()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current)
      }
    }
  }, [enabled, resetTimer, startIdleTimer])

  if (!enabled || (!isActive && !isHiding)) {
    return null
  }

  return (
    <div
      className={`
        fixed inset-0 z-[2000] flex flex-col items-center justify-center
        bg-[#333333] cursor-default font-sans
        transition-opacity duration-500 ease-in-out
        ${isActive && !isHiding ? 'opacity-100 animate-fadeIn' : ''}
        ${isHiding ? 'animate-fadeOut' : ''}
      `}
      onMouseMove={hideOverlay}
      onTouchStart={hideOverlay}
      onClick={hideOverlay}
    >
      {/* SVG Lampadina */}
      <svg
        className={`w-[120px] h-[150px] mb-10 transition-all duration-300 ${isHiding ? 'animate-lampGlow' : ''}`}
        viewBox="0 0 100 130"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill="none" stroke="#9B9C9D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Bulbo della lampadina */}
          <path d="M50 10
                   C25 10 15 30 15 50
                   C15 70 30 80 35 90
                   L65 90
                   C70 80 85 70 85 50
                   C85 30 75 10 50 10 Z"/>

          {/* Riflesso sul bulbo */}
          <path d="M30 25 C25 35 25 45 30 50" opacity="0.5"/>

          {/* Filamento interno */}
          <path d="M40 60 L45 50 L50 60 L55 50 L60 60"/>

          {/* Supporti del filamento */}
          <line x1="42" y1="90" x2="42" y2="70"/>
          <line x1="58" y1="90" x2="58" y2="70"/>

          {/* Base della lampadina */}
          <rect x="35" y="90" width="30" height="8" rx="2"/>
          <rect x="37" y="98" width="26" height="6" rx="1"/>
          <rect x="39" y="104" width="22" height="6" rx="1"/>
          <rect x="41" y="110" width="18" height="6" rx="1"/>

          {/* Contatto inferiore */}
          <ellipse cx="50" cy="120" rx="8" ry="4"/>
        </g>
      </svg>

      {/* Titolo */}
      <h1 className="text-[#9B9C9D] text-[clamp(32px,6vw,82px)] font-bold mx-5 text-center tracking-tight">
        {title}
      </h1>

      {/* Descrizione */}
      <p className="text-[#9B9C9D] text-[clamp(14px,2vw,24px)] font-normal mt-8 mx-5 text-center max-w-[800px] leading-relaxed">
        {description}
      </p>

      {/* Logo */}
      {logoText && (
        <div className="mt-16 opacity-60">
          <span className="text-[#9B9C9D] text-xl font-semibold tracking-[3px] border-2 border-[#9B9C9D] py-2 px-5 rounded">
            {logoText}
          </span>
        </div>
      )}

      {/* Stili per le animazioni */}
      <style>{`
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes fadeOut {
          0% { opacity: 1; }
          66% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes lampGlow {
          0% { filter: drop-shadow(0 0 0px rgba(155, 156, 157, 0)); }
          50% { filter: drop-shadow(0 0 20px rgba(255, 220, 100, 0.8)); }
          100% { filter: drop-shadow(0 0 0px rgba(155, 156, 157, 0)); }
        }

        .animate-fadeIn {
          animation: fadeIn 1s ease-in-out;
        }

        .animate-fadeOut {
          animation: fadeOut 1.5s ease-in-out forwards;
        }

        .animate-lampGlow {
          animation: lampGlow 0.8s ease-in-out;
        }
      `}</style>
    </div>
  )
}
