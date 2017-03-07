import sqlAliasAwareFieldResolver from "./sqlAliasAwareFieldResolver"
import simpleResolveSQLParts from "./simpleResolveSQLParts"
import typeDetails from "./typeDetails"

export function createSqlResolve(schemaFn, fetchRows){
  return (fn) => {
    return (obj,args,ctx,info) => {
      return simpleResolve(fn(obj,args,ctx,info), schemaFn(), info, fetchRows)
    }
  }
}


export function sqlAliasAwareResolvers(schema){
  return Object
    .keys(schema.getTypeMap())
    .map(e => schema.getTypeMap()[e])
    .filter(e => e.constructor.name === "GraphQLObjectType")
    .filter(e => !e.name.match(/^__/))
    .filter(e => ![
      schema.getQueryType(),
      schema.getMutationType(),
      schema.getSubscriptionType()
    ].includes(e))
    .reduce((memo, type) => {
      return {
        ...memo,
        [type.name]: Object.keys(type._fields).reduce((memo, key) => {
          return {...memo, [key]: sqlAliasAwareFieldResolver.bind(null, type._fields[key].resolve)}
        }, {})
      }
    }, {})
}

export function simpleResolve([relation,...relationParams], schema, info, fetchRows){
  let {sql,params} = simpleResolveSQLParts([relation,...relationParams], schema, info),
      fieldType = typeDetails(info.returnType)

  return fetchRows(sql,params).then(res => {
    if(Array.isArray(res)){
      if(!fieldType.isList)
      return res[0]
    }

    return res
  })
}
