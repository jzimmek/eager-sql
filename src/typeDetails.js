export default function(type){
  let isList = false,
      isNotNull = false

  if(type.constructor.name === "GraphQLNonNull"){
    isNotNull = true
    type = type.ofType
  }

  if(type.constructor.name === "GraphQLList"){
    isList = true
    type = type.ofType
  }

  let isObject = (type.constructor.name === "GraphQLObjectType"),
      isInterface = (type.constructor.name === "GraphQLInterfaceType"),
      isUnion = (type.constructor.name === "GraphQLUnionType")

  return {type, isList, isNotNull, isObject, isInterface, isUnion}
}
