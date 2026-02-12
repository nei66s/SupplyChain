"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const id = React.useId().replace(/:/g, "-")
  const pct = 100 - (value || 0)
  const rootClass = `progress-${id}`
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `.${rootClass} > .indicator { transform: translateX(-${pct}%); }`,
        }}
      />
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
          rootClass,
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className="h-full w-full flex-1 bg-primary transition-all indicator"
        />
      </ProgressPrimitive.Root>
    </>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
