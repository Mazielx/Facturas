"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { shouldUseHistoryBack } from "@/lib/back-nav"

interface BackLinkProps {
  fallback: string
  children: React.ReactNode
  className?: string
  title?: string
}

export default function BackLink({ fallback, children, className, title }: BackLinkProps) {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (shouldUseHistoryBack()) {
      router.back()
    } else {
      router.push(fallback)
    }
  }

  return (
    <Link href={fallback} onClick={handleClick} title={title} className={className}>
      {children}
    </Link>
  )
}
