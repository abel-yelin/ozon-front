export type LocalizedRouteMap = Record<string, Record<string, string>>;

export const localizedRoutes = {
  'dashboard.imagestudio': {
    en: '/dashboard/imagestudio',
    zh: '/dashboard/imagestudio',
  },
} as const satisfies LocalizedRouteMap;

export type LocalizedRouteKey = keyof typeof localizedRoutes;

export function resolveLocalizedRoute(
  key: LocalizedRouteKey | string,
  locale?: string
): string {
  const entry = localizedRoutes[key as LocalizedRouteKey];
  if (!entry) return '';

  const normalized = locale === 'zh-CN' ? 'zh' : locale;
  if (normalized && normalized in entry) {
    return entry[normalized as keyof typeof entry];
  }

  return entry.en ?? Object.values(entry)[0] ?? '';
}
