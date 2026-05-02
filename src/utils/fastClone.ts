import cloneDeep from "lodash/cloneDeep";

export default function fastClone<T>(obj: T): T {
  return cloneDeep(obj);
}
