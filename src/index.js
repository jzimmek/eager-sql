/*global Buffer*/

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

export const pagination = {
  cursor: ({before,after,first,last}, fn) => {
    after = after ? JSON.parse(Buffer.from(after, "base64").toString("utf8")) : []
    before = before ? JSON.parse(Buffer.from(before, "base64").toString("utf8")) : []

    const limit = Math.max(first||0,last||0) || 10,
          subSql = fn(before, after),
          withSql = sql`
            with query as (
              ${sql.raw(subSql)}
            ), limited_query as (
              select * from query order by "$row_number" ${sql.raw(first ? "asc" : "desc")} limit ${limit}
            ), ordered_query as (
              select * from limited_query order by "$row_number" asc
            ), edges as (
              select json_build_object('cursor', encode(cast(cast("$cursor" as text) as bytea),'base64'), 'node', cast(to_json(q) as jsonb) - '$cursor' - '$row_number') from ordered_query q
            ), connection as (
              select json_build_object(
                'edges',
                coalesce((select json_agg(e.json_build_object) from edges e), cast('[]' as json)),
                'pageInfo',
                json_build_object(
                  'hasPreviousPage',
                  coalesce((select count(1) > cast(${last} as integer) from query), false),
                  'hasNextPage',
                  coalesce((select count(1) > cast(${first} as integer) from query), false)
                )
              )
            )
            select json_build_object from connection
          `

    return withSql
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
