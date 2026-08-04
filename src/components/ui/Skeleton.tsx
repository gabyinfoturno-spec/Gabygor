import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
  lines?: number
}

export function Skeleton({ className, lines = 1, ...props }: SkeletonProps) {
  const skeletonClass = cn(
    'relative overflow-hidden rounded bg-[var(--bg-tertiary)]/70',
    'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite]',
    'before:bg-gradient-to-r before:from-transparent before:via-white/45 dark:before:via-white/5 before:to-transparent',
    className
  )

  if (lines > 1) {
    return (
      <div className="space-y-3" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              skeletonClass,
              i === lines - 1 && 'w-3/4'
            )}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={skeletonClass}
      {...props}
    />
  )
}
