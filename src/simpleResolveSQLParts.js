import typeDetails from "./typeDetails"
import traverse from "./traverse"

export default function([relation,...relationParams], schema, info){
  const queryAst = info.fieldNodes[0]

  let parts = [],
      emit = (part) => {
        parts = [...parts, part]
      },
      path = [queryAst.name.value]

  let fieldType = typeDetails(info.returnType)

  traverse({
    schema,
    queryAst,
    info,
    fieldTypeObj: fieldType.type,
    relation,
    relationParams,
    emit,
    path,
    selectTypeColumn: false,
    filterFragments: [],
  })

  let sql = parts.map(([sql]) => sql).join(""),
      params = parts.reduce((memo, [_sql,...params]) => [...memo, ...params], [])

  return {sql,params}
}
