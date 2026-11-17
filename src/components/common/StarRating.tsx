import { Star } from 'lucide-react';
import { cn } from '@/src/utils/cn';

interface StarRatingDisplayProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function StarRatingDisplay({ rating, count, size = 'sm', className }: StarRatingDisplayProps) {
  const iconClass = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  const rounded = Math.round(rating);

  return (
    <div
      className={cn('inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400', className)}
      aria-label={`Rated ${rating.toFixed(1)} out of 5`}
    >
      <div className="inline-flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              iconClass,
              star <= rounded
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-zinc-300 dark:text-zinc-700'
            )}
          />
        ))}
      </div>
      <span className="font-mono font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
        {rating > 0 ? rating.toFixed(1) : '0.0'}
      </span>
      {typeof count === 'number' ? (
        <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">({count})</span>
      ) : null}
    </div>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
}

export function StarRatingInput({ value, onChange }: StarRatingInputProps) {
  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Select rating from 1 to 5 stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          onClick={() => onChange(star)}
          className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Star
            className={cn(
              'h-5 w-5 transition-colors',
              star <= value
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-zinc-300 dark:text-zinc-600 hover:text-amber-300'
            )}
          />
        </button>
      ))}
    </div>
  );
}
