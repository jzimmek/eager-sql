import astArguments from "./astArguments"
import typeDetails from "./typeDetails"
import gatherFieldSelections from "./gatherFieldSelections"

function emitScalarType({
  _queryAst,
  selectionSqlConfigField,
  selectionArgs,
  tableAs,
  _selectionIsList,
  _selectionIsNotNull,
  _selectionType,
  _selectionAlias,
  selectionName,
  _columnAlias,
  emit,
  _path,
  _schema,
  _info,
  _addLateralJoin,
}){
  if(typeof(selectionSqlConfigField)==="function"){
    emit(selectionSqlConfigField(selectionArgs, tableAs))
  }else if(typeof(selectionSqlConfigField) === "string"){
    emit([`"${tableAs}"."${selectionSqlConfigField}"`])
  }else{
    emit([`"${tableAs}"."${selectionName}"`])
  }
}

function emitInterfaceUnionType({
  queryAst,
  selectionSqlConfigField,
  selectionArgs,
  tableAs,
  selectionIsList,
  _selectionIsNotNull,
  _selectionType,
  selectionAlias,
  selectionName,
  columnAlias,
  emit,
  path,
  schema,
  info,
  addLateralJoin,
}){
  if(selectionIsList)   emit([`"${columnAlias}".json_agg `])
  else                  emit([`"${columnAlias}".to_json `])

  addLateralJoin({
    joinAs: `${columnAlias}`,
    fn: () => {
      if(selectionIsList)   emit([`(select json_agg(x) from (`])
      else                  emit([`(select to_json(x) from (`])

      let subTypes = selectionSqlConfigField(selectionArgs, tableAs)

      Object.keys(subTypes).forEach((key, idx, arr) => {
        let [subTypeRelation, ...subTypeRelationParams] = subTypes[key],
            obj = schema.getTypeMap()[key]

        emit([`(select to_json(x) as x from (`])

        traverse({
          schema,
          queryAst,
          info,
          fieldTypeObj: typeDetails(obj).type,
          relation: subTypeRelation,
          relationParams: subTypeRelationParams,
          emit,
          path: [...path, selectionAlias?`${selectionAlias}:${selectionName}`:selectionName],
          selectTypeColumn: key,
          filterFragments: [key], // TODO proper fragment handling (TBD coalesce(to_json(*) -> 'someField', null) to handle non-existing columns)
        })

        emit([`) x)`])

        if(idx < arr.length - 1)
          emit([` union all `])
      })

      emit([`) x)`])
    }
  })
}



function emitRelayConnection({
  _queryAst,
  selectionSqlConfigField,
  selectionArgs,
  tableAs,
  _selectionIsList,
  _selectionIsNotNull,
  _selectionType,
  _selectionAlias,
  _selectionName,
  columnAlias,
  emit,
  _path,
  _schema,
  _info,
  addLateralJoin,
}){
  emit([`"${columnAlias}".json_build_object `])

  addLateralJoin({
    joinAs: `${columnAlias}`,
    fn: () => emit(selectionSqlConfigField(selectionArgs, tableAs))
  })
}


function emitObjectType({
  queryAst,
  selectionSqlConfigField,
  selectionArgs,
  tableAs,
  selectionIsList,
  selectionIsNotNull,
  selectionType,
  selectionAlias,
  selectionName,
  columnAlias,
  emit,
  path,
  schema,
  info,
  addLateralJoin,
}){
  if(!selectionSqlConfigField)
    throw new Error(`GraphQLObjectType and GraphQLList expects entry in sql config for field: ${selectionName}`)

  let [nextRelation, ...nextRelationParams] = selectionSqlConfigField(selectionArgs, tableAs)

  if(selectionIsList)   emit([`"${columnAlias}".json_agg `])
  else                  emit([`"${columnAlias}".to_json `])

  addLateralJoin({
    joinAs: `${columnAlias}`,
    fn: () => {

      if(selectionIsList){
        if(selectionIsNotNull)  emit([`(select coalesce(json_agg(x),cast('[]' as json)) as json_agg from (`])
        else                    emit([`(select json_agg(x) from (`])
      }else{
        emit([`(select to_json(x) from (`])
      }

      traverse({
        schema,
        queryAst,
        info,
        fieldTypeObj: selectionType,
        relation: nextRelation,
        relationParams: nextRelationParams,
        emit,
        path: [...path, selectionAlias?`${selectionAlias}:${selectionName}`:selectionName],
        selectTypeColumn: false,
        filterFragments: [],
      })

      emit([`) x)`])
    }
  })
}


function emitExcluded({selectionsExcluded,sqlConfigDeps,getSelectedColumns,tableAs,emit,addSelectedColumns}){
  selectionsExcluded.forEach((e,idx) => {
    let selectedColumns = getSelectedColumns(),
        deps = (sqlConfigDeps[e.name.value] || []).filter(e => !selectedColumns.includes(e))

    if(deps.length){
      addSelectedColumns(deps)

      // does any sql-based selection exist?
      if((idx === 0 && selectedColumns.length) || idx > 0)
        emit([`, `])

      deps.forEach((dep, depIdx) => {
        emit([`"${tableAs}"."${dep}" as "${dep}"`])
        if(depIdx < deps.length - 1)
          emit([`, `])
      })
    }
  })
}

function traverse({schema, queryAst, info, fieldTypeObj, relation, relationParams, emit, path, selectTypeColumn, filterFragments}){

  let {type: fieldType} = typeDetails(fieldTypeObj),
      sqlConfig = fieldType.sql || fieldType._typeConfig.sql, // TODO: seem like a change graphql 0.8.x and 0.9.x
      sqlConfigFields = (sqlConfig && sqlConfig.fields) || {},
      sqlConfigDeps = (sqlConfig && sqlConfig.deps) || {},
      availableFields = {
        ...Object.keys(fieldType._fields).reduce((memo,e) => ({...memo, [e]: true}), {}),
        ...sqlConfigFields,
        ...Object.keys(sqlConfigDeps).reduce((memo,key) => ({[key]: false}), {}),
      },
      tableAs = fieldType.name.toLowerCase(),
      selectionsAll = gatherFieldSelections(queryAst, info, filterFragments).filter(e => !e.name.value.match(/^__/)),
      selectionsExcluded = selectionsAll.filter(e => !availableFields[e.name.value]),
      selections = selectionsAll.filter(e => availableFields[e.name.value]),
      selectedColumns = [],
      getSelectedColumns = () => selectedColumns,
      addSelectedColumns = (columns) => selectedColumns = [...selectedColumns, ...columns],
      lateralJoins = [],
      addLateralJoin = (join) => lateralJoins = [...lateralJoins, join]

  if(!sqlConfig)
    throw new Error(`no sql config found for type: ${fieldType.name}; ${path.join(".")}`)

  emit([`select `])

  if(selectTypeColumn){
    emit([`coalesce(to_json(${tableAs}.*) ->> '$type', '${selectTypeColumn}') as "$type" `])
    if(selections.length)
      emit([`, `])
  }

  selections.forEach((e) => {
    let selectionAlias = e.alias && e.alias.value,
        selectionName = e.name.value,
        {type: selectionType, isList: selectionIsList, isObject: selectionIsObject, isInterface: selectionIsInterface, isUnion: selectionIsUnion, isNotNull: selectionIsNotNull} = typeDetails(fieldTypeObj._fields[selectionName].type),
        selectionSqlConfigField = sqlConfigFields[selectionName],
        selectionArgs = astArguments(e, info),
        columnAlias = `${selectionAlias||selectionName}`,
        traverseArgs = {
          queryAst: e,
          selectionSqlConfigField,
          selectionArgs,
          selectionIsList,
          selectionIsNotNull,
          selectionType,
          selectionAlias,
          selectionName,
          tableAs,
          columnAlias,
          emit,
          path,
          schema,
          info,
          addLateralJoin,
        }

    let skip = e.directives
      .filter(d => d.name.value === "skip")
      .reduce((memo,directive) => memo || astArguments(directive, info)[directive.arguments[0].name.value], false)

    if(skip)
      return

    let include = e.directives
      .filter(d => d.name.value === "include")
      .reduce((memo,directive) => memo && astArguments(directive, info)[directive.arguments[0].name.value], true)

    if(!include)
      return

    if(getSelectedColumns().length)
      emit([`, `])

    if(selectionType.toString().match(/Connection$/)){
      emitRelayConnection(traverseArgs)
    }else if(selectionIsObject){
      emitObjectType(traverseArgs)
    } else if(selectionIsInterface||selectionIsUnion) {
      emitInterfaceUnionType(traverseArgs)
    } else {
      emitScalarType(traverseArgs)
    }

    emit([` as "${columnAlias}"`])

    addSelectedColumns([columnAlias])
  })

  emitExcluded({selectionsExcluded,sqlConfigDeps,getSelectedColumns,tableAs,emit,addSelectedColumns})

  emit([` from (${relation}) /*${path.join(".")}*/ as "${tableAs}"`, ...relationParams])

  lateralJoins.forEach(({joinAs,fn}) => {
    emit([` left join lateral (`])
    fn()
    emit([`) as "${joinAs}" on true`])
  })
}

export default traverse
