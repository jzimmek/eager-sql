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

function sql(...args){
  let [parts,...vars] = args,
      retVars = [],
      s = parts.reduce((memo, part, idx) => {
        let nextMemo = memo + part

        if(idx < vars.length){
          let varValue = vars[idx]

          if(varValue === undefined)
            varValue = null

          if(varValue && varValue.__raw){
            let varRes = varValue.__raw

            if(Array.isArray(varRes)){
              let [s2,...vars2] = varRes
              nextMemo += s2
              retVars = [...retVars, ...vars2]
            }else{
              nextMemo += varRes
            }
          }else{
            nextMemo += "?"
            retVars = [...retVars, varValue]
          }

        }

        return nextMemo
      }, "")

  return [s, ...retVars]
}
sql.raw = (val) => ({__raw: val})

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

export {
  sql
}
