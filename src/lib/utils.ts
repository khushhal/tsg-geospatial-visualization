import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number | undefined): string {
  if (num === undefined) return "N/A";
  return num.toLocaleString();
}

export function formatCurrency(num: number | string | undefined): string {
  if (num === undefined) return "N/A";
  return `$${num.toLocaleString()}`;
}
