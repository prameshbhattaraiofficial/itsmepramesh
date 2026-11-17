import { cn } from '@/src/utils/cn';

interface SectionHeadingProps {
  indexLabel?: string;
  title: string;
  description?: string;
  className?: string;
}

export function SectionHeading({ indexLabel, title, description, className }: SectionHeadingProps) {
  return (
    <div className={cn('max-w-2xl', className)}>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 text-balance">
        {indexLabel ? <span className="font-mono text-blue-600 dark:text-blue-400 mr-2.5 text-lg sm:text-xl font-medium">{indexLabel}</span> : null}
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
          {description}
        </p>
      ) : null}
    </div>
  );
}
