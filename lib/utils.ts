import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  value = Math.round(value * 100) / 100;
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
