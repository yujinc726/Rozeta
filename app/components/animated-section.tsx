"use client"

import type { ReactNode } from "react"
import { useIntersectionObserver } from "../hooks/use-intersection-observer"

interface AnimatedSectionProps {
  children: ReactNode
  animation?: "fade-up" | "fade-in" | "slide-left" | "slide-right" | "scale-up"
  delay?: number
  className?: string
}

export function AnimatedSection({ children, animation = "fade-up", delay = 0, className = "" }: AnimatedSectionProps) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  })

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        ...(isIntersecting
          ? {
              opacity: 1,
              transform: "translateY(0) translateX(0) scale(1)",
            }
          : {
              opacity: 0,
              transform: getInitialTransform(animation),
            }),
      }}
    >
      {children}
    </div>
  )
}

function getInitialTransform(animation: string): string {
  switch (animation) {
    case "fade-up":
      return "translateY(30px)"
    case "fade-in":
      return "translateY(0)"
    case "slide-left":
      return "translateX(-30px)"
    case "slide-right":
      return "translateX(30px)"
    case "scale-up":
      return "scale(0.95)"
    default:
      return "translateY(30px)"
  }
}
