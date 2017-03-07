import parseArgValue from "./parseArgValue"

export default function(e, info){
  const {kind} = e
  switch(kind){
    case "Variable":
      return info.variableValues[e.name.value]
    case "IntValue":
    case "FloatValue":
    case "StringValue":
    case "BooleanValue":
    case "NullValue":
      return parseArgValue(e)
    default:
      throw new Error(`unsupported argument kind: ${kind}`)
  }
}
