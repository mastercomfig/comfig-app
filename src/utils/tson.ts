import { Typeson } from "typeson";
import { set } from "typeson-registry";

const TSON = new Typeson().register([set]);

export function parse(text: string) {
  return TSON.parse(text);
}

export function stringify(obj: any) {
  return TSON.stringify(obj);
}

export default {
  parse,
  stringify,
};
