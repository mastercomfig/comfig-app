export default function Global(props) {
  for (const prop of Object.keys(props)) {
    if (prop === 'children') {
      continue;
    }
    globalThis[prop] = props[prop];
  }

  return (
    <></>
  )
}