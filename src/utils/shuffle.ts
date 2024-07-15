import clone from "lodash/clone";
import seedrandom from "seedrandom";

export function shuffle<Type>(originalArray: Type[], seed: string): Type[] {
  const random = seedrandom(seed);

  const array = clone(originalArray);

  let index = -1;
  const length = array.length;
  const lastIndex = length - 1;

  while (++index < length) {
    const rand = index + Math.floor(random() * (lastIndex - index + 1));
    const old = array[index] as Type;
    const value = array[rand] as Type;
    array[rand] = old;
    array[index] = value;
  }

  return array;
}
