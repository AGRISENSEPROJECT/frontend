/**
 * Agrisense design tokens — shared visual language across the app.
 * Prefer these over one-off hex values in new UI work.
 */
export const colors = {
  brand: '#0B4D26',
  brandMid: '#166534',
  brandSoft: '#E8F5E9',
  brandWash: '#F0FDF4',
  brandMuted: '#BBF7D0',

  bg: '#F4F7F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAF8',

  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textOnBrand: '#FFFFFF',

  border: '#E5E7EB',
  borderStrong: '#D1D5DB',

  danger: '#DC2626',
  dangerSoft: '#FEF2F2',

  unread: '#25D366', // WhatsApp-like green for badges
  overlay: 'rgba(15, 23, 42, 0.45)',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  full: 999,
} as const;

export const type = {
  title: { fontSize: 20, fontWeight: '800' as const, color: colors.text },
  section: { fontSize: 16, fontWeight: '800' as const, color: colors.text },
  body: { fontSize: 15, fontWeight: '500' as const, color: colors.text },
  caption: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary },
  meta: { fontSize: 12, fontWeight: '600' as const, color: colors.textMuted },
  label: { fontSize: 11, fontWeight: '800' as const, color: colors.textMuted, letterSpacing: 0.6 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  float: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;
