function flatten(arr){
  return arr.reduce((memo, e) => Array.isArray(e) ? [...memo, ...flatten(e)] : [...memo, e], [])
}

// export default function toExecutableSqlAndParams(sqlArr){
//   const sqlArrFlatten = flatten(sqlArr),
//         sql = sqlArrFlatten.filter(e => typeof(e) === "string").join(" "),
//         params = sqlArrFlatten.filter(e => typeof(e) !== "string").map(e => e.__param)
//
//   return {sql,params}
// }

export default function toExecutableSqlAndParams(sqlArr){
  let varIdx = 1

  // throw new Error(JSON.stringify(flatten(sqlArr),null,2))

  const sqlArrFlatten = flatten(sqlArr),
        sql = sqlArrFlatten.map(e => {
          return typeof(e) === "string" ? e : `$${varIdx++}`
        }).join(""),
        params = sqlArrFlatten.filter(e => e && typeof(e) === "object" && e.hasOwnProperty("__param")).map(e => e.__param)

  return {sql,params}
}
