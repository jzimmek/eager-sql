import convertArgValue from "./convertArgValue"

export default function(ast, info){
  return ast.arguments.reduce((memo,e) => ({
    ...memo,
    [e.name.value]: convertArgValue(e.value, info),
  }), {})
}
