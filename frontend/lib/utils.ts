import { clsx, type ClassValue } from "clsx";

// Single class-name helper for the landing pack. clsx is already in
// node_modules (a dependency of other packages); no new install needed.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
