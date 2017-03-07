export default function({kind,value}){
  switch(kind){
    case "IntValue":
      return parseInt(value, 10)
    case "FloatValue":
      return parseFloat(value)
    case "BooleanValue":
      return value === true
    case "NullValue":
      return null
    case "StringValue":
      return value
    default:
      throw new Error(`unsupported argument kind: ${kind}`)
  }
}
