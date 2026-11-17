import { Languages } from 'lucide-react';
import { useLanguage } from '@/src/app/providers/LanguageProvider';
import { cn } from '@/src/utils/cn';

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language switcher"
      title={t('switchLanguage')}
      className={cn(
        'inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111114] p-0.5 text-xs shrink-0',
        className
      )}
    >
      <Languages className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400 mx-1.5 shrink-0" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={cn(
          'px-2 py-1 rounded-md font-mono text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer',
          lang === 'en'
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('ne')}
        aria-pressed={lang === 'ne'}
        className={cn(
          'px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer',
          lang === 'ne'
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
        )}
      >
        नेपाली
      </button>
    </div>
  );
}
