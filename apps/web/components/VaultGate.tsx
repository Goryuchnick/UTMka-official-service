'use client'

/**
 * Приглашение завести фразу — общая заглушка для разделов, которым нужен вход.
 *
 * Формулировка важна: это приглашение, а не стена. Инструмент работает целиком
 * и без входа, за фразой только хранение (ARCHITECTURE §5.3).
 */

import Link from 'next/link'

import { PixelIcon } from '@/components/PixelIcon'

interface VaultGateProps {
  title: string
  what: string
}

export function VaultGate({ title, what }: VaultGateProps) {
  return (
    <div className="glass">
      <div className="qhead">
        <span className="qchip qchip--magenta">
          <PixelIcon name="key" />
        </span>
        <span className="qtitle qtitle--magenta">{title}</span>
      </div>

      <p className="hint">{what}</p>

      <div className="invite">
        <span>
          <b>Одно поле, ни почты, ни пароля.</b> Фраза из пяти слов — она же логин. На другом
          устройстве введёте её же и увидите то же самое.
        </span>
        <Link className="btn btn--sm" href="/login">
          <PixelIcon name="key" />
          Завести фразу
        </Link>
      </div>
    </div>
  )
}
