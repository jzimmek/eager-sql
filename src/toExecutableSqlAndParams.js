import flattenDeep from "lodash/fp/flattenDeep"

export default function toExecutableSqlAndParams(sqlArr){
  let varIdx = 1
  const sqlArrFlatten = flattenDeep(sqlArr),
        sql = sqlArrFlatten.map(e => {
          return typeof(e) === "string" ? e : `$${varIdx++}`
        }).join(""),
        params = sqlArrFlatten.filter(e => e && typeof(e) === "object" && e.hasOwnProperty("__param")).map(e => e.__param)

  return {sql,params}
}
