"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { popBackTarget } from "@/lib/back-nav"

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
    const target = popBackTarget()
    if (target) {
      router.replace(target)
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
