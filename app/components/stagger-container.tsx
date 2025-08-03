"use client"

import { type ReactNode, Children, cloneElement, isValidElement } from "react"
import { useIntersectionObserver } from "../hooks/use-intersection-observer"

interface StaggerContainerProps {
  children: ReactNode
  staggerDelay?: number
  className?: string
}

export function StaggerContainer({ children, staggerDelay = 100, className = "" }: StaggerContainerProps) {
  const { ref, isIntersecting } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  })

  return (
    <div ref={ref} className={className}>
      {Children.map(children, (child, index) => {
        if (isValidElement(child)) {
          return cloneElement(child, {
            ...child.props,
            style: {
              ...child.props.style,
              transition: "all 0.6s ease-out",
              transitionDelay: `${index * staggerDelay}ms`,
              opacity: isIntersecting ? 1 : 0,
              transform: isIntersecting ? "translateY(0)" : "translateY(20px)",
            },
          })
        }
        return child
      })}
    </div>
  )
}
