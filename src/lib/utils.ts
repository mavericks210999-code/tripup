export function cn(...classes: (string | undefined | null | boolean | 0)[]): string {
  return classes.filter(Boolean).join(" ");
}
