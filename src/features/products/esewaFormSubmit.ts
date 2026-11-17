import type { EsewaInitiationDto } from '@/src/types/portfolio';

export function submitEsewaForm(esewa: EsewaInitiationDto): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = esewa.formUrl;
  form.style.display = 'none';

  // If embedded inside an iframe (such as preview mode), open eSewa in a new tab
  // because eSewa's gateway blocks framing with X-Frame-Options.
  try {
    if (window.self !== window.top) {
      form.target = '_blank';
      form.rel = 'noopener noreferrer';
    }
  } catch {
    form.target = '_blank';
  }

  Object.entries(esewa.fields).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}
