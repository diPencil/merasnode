'use client'

import * as React from 'react'
import * as ProgressPrimitive from '@radix-ui/react-progress'

import { cn } from '@/lib/utils'

function Progress({
  className,
  value,
  dir,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { dir?: "ltr" | "rtl" }) {
  const v = value ?? 0
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      dir={dir}
      className={cn(
        'bg-primary/20 relative h-2 w-full overflow-hidden rounded-full',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full flex-1 transition-all rtl:ms-auto"
        style={dir === "rtl" ? { width: `${v}%` } : { transform: `translateX(-${100 - v}%)`, width: "100%" }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
