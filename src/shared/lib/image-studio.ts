export function getFileNameFromUrl(url: string | null | undefined) {
  if (!url) return '';
  try {
    const parsed = new URL(url, 'http://local');
    const parts = parsed.pathname.split('/').filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || '');
  } catch (_) {
    const parts = String(url).split('?')[0].split('/').filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || '');
  }
}

export function getStemFromFilename(filename: string | null | undefined) {
  if (!filename) return '';
  const base = filename.split('/').pop() || '';
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}

export function isMainStem(stem: string) {
  if (!stem) return false;
  const parts = stem.split('_');
  return parts[parts.length - 1] === '1';
}

export function guessTemplateLanguage(templateKey: string) {
  if (templateKey.endsWith('_en')) return 'en';
  if (templateKey.endsWith('_cn')) return 'cn';
  return 'cn';
}
