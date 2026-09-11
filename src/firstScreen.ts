import { patterns } from "./active";

let noted = false;

export function noteFirstScreen(): void {
  if (noted) {
    return;
  }
  noted = true;
  patterns().onFirstScreen();
}
