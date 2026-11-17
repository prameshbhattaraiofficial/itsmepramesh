import { useState } from 'react';
import { Code2 } from 'lucide-react';
import { cn } from '@/src/utils/cn';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  fallbackTitle: string;
  fallbackSubtitle?: string;
  className?: string;
  imgClassName?: string;
}

export function SafeImage({
  src,
  alt,
  fallbackTitle,
  fallbackSubtitle,
  className,
  imgClassName,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-200 dark:from-[#121318] dark:via-[#0B0C0F] dark:to-[#161822] p-6 text-center',
          className
        )}
      >
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 text-blue-600 dark:text-blue-400">
          <Code2 className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 line-clamp-2 max-w-[24ch]">
          {fallbackTitle}
        </p>
        {fallbackSubtitle ? (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{fallbackSubtitle}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-zinc-100 dark:bg-zinc-900', className)}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={cn('h-full w-full object-cover', imgClassName)}
      />
    </div>
  );
}
