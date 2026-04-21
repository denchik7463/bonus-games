import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPoints(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

export function formatBonus(value: number) {
  return `${formatPoints(value)} баллов`;
}
