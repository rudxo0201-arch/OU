import {
  Note,
  CalendarBlank,
  CheckSquare,
  CurrencyKrw,
  Fire,
  Lightbulb,
  UsersThree,
  Heart,
  MapPin,
  Image,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';

export const APP_ICON_MAP: Record<string, PhosphorIcon> = {
  Note,
  CalendarBlank,
  CheckSquare,
  CurrencyKrw,
  Fire,
  Lightbulb,
  UsersThree,
  Heart,
  MapPin,
  Image,
};

export function resolveAppIcon(iconName: string): PhosphorIcon | null {
  return APP_ICON_MAP[iconName] ?? null;
}
