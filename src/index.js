function sqlAliasAwareFieldResolver(origResolve, obj, args, ctx, info){
  let ast = info.fieldNodes[0],
      key = ast.alias ? ast.alias.value : ast.name.value,
      res = obj[key]

  if(res === undefined)
    res = origResolve(obj, args, ctx, info)

  return res
}

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

export function simpleResolveSQLParts([relation,...relationParams], schema, info){
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
      params = parts.reduce((memo, [sql,...params]) => [...memo, ...params], [])

  return {sql,params}
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

function typeDetails(type){
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

function gatherFieldSelections(ast, info, filterFragments){
  let fields = ast
    .selectionSet
    .selections
    .filter(e => e.kind === "Field")

  fields = ast
    .selectionSet
    .selections
    .filter(e => e.kind === "FragmentSpread")
    .map(e => info.fragments[e.name.value])
    .reduce((memo, fragment) => {
      return [
        ...memo,
        ...gatherFieldSelections(fragment, info, filterFragments),
      ]
    }, fields)

  fields = ast
    .selectionSet
    .selections
    .filter(e => e.kind === "InlineFragment")
    .filter(e => filterFragments.length === 0 || filterFragments.includes(e.typeCondition.name.value))
    .reduce((memo, fragment) => {
      return [
        ...memo,
        ...gatherFieldSelections(fragment, info, filterFragments),
      ]
    }, fields)

  return fields
}

function traverse({schema, queryAst, info, fieldTypeObj, relation, relationParams, emit, path, selectTypeColumn, filterFragments}){

  let {type: fieldType} = typeDetails(fieldTypeObj),
      args = astArguments(queryAst, info),
      sqlConfig = fieldType.sql || fieldType._typeConfig.sql, // TODO: seem like a change graphql 0.8.x and 0.9.x
      sqlConfigFields = (sqlConfig && sqlConfig.fields) || {},
      sqlConfigDeps = (sqlConfig && sqlConfig.deps) || {}

  // console.info(Object.keys(fieldTypeObj),Object.keys(fieldType),Object.keys(fieldTypeObj._typeConfig))

  if(!sqlConfig)
    throw new Error(`no sql config found for type: ${fieldType.name}; ${path.join(".")}`)

  let availableFields = {
        ...Object.keys(fieldType._fields).reduce((memo,e) => ({...memo, [e]: true}), {}),
        ...sqlConfigFields,
        ...Object.keys(sqlConfigDeps).reduce((memo,key) => ({[key]: false}), {}),
      },
      tableAs = fieldType.name.toLowerCase(),
      selectionsAll = gatherFieldSelections(queryAst, info, filterFragments).filter(e => !e.name.value.match(/^__/)),
      selectionsExcluded = selectionsAll.filter(e => !availableFields[e.name.value]),
      selections = selectionsAll.filter(e => availableFields[e.name.value])

  emit([`select `])

  if(selectTypeColumn){
    emit([`coalesce(to_json(${tableAs}.*) ->> '$type', '${selectTypeColumn}') as "$type" `])
    if(selections.length)
      emit([`, `])
  }

  selections.forEach((e, idx, arr) => {
    let selectionAlias = e.alias && e.alias.value,
        selectionName = e.name.value

    // console.info(">>", selectionName, fieldTypeObj, fieldTypeObj._fields[selectionName])

    let {type: selectionType, isList: selectionIsList, isObject: selectionIsObject, isInterface: selectionIsInterface, isUnion: selectionIsUnion, isNotNull: selectionIsNotNull} = typeDetails(fieldTypeObj._fields[selectionName].type),
        selectionSqlConfigField = sqlConfigFields[selectionName],
        selectionArgs = astArguments(e, info)

    if(selectionIsObject){
      if(!selectionSqlConfigField)
        throw new Error(`GraphQLObjectType and GraphQLList expects entry in sql config for field: ${selectionName}`)

      let [nextRelation, ...nextRelationParams] = selectionSqlConfigField(selectionArgs, tableAs),
          jsonFn = selectionIsList ? "json_agg" : "to_json"

      if(selectionIsNotNull)
        emit([`coalesce(`])

      emit([`(select ${jsonFn}(x) from (`])


      traverse({
        schema,
        queryAst: e,
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

      if(selectionIsNotNull)
        emit([`, '[]'::json)`])

    } else if(selectionIsInterface||selectionIsUnion) {
      let subTypes = selectionSqlConfigField(selectionArgs, tableAs),
          jsonFn = selectionIsList ? "json_agg" : "to_json"

      emit([`(select ${jsonFn}(x) from (`])
      Object.keys(subTypes).forEach((key, idx, arr) => {
        let [subTypeRelation, ...subTypeRelationParams] = subTypes[key]

        emit([`(select to_json(x) as x from (`])

        let obj = schema.getTypeMap()[key]

        traverse({
          schema,
          queryAst: e,
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

    } else {
      if(typeof(selectionSqlConfigField)==="function"){
        emit(selectionSqlConfigField(selectionArgs, tableAs))
      }else if(typeof(selectionSqlConfigField) === "string"){
        emit([`${tableAs}.${selectionSqlConfigField}`])
      }else{
        emit([`${tableAs}.${selectionName}`])
      }
      // emit(typeof(selectionSqlConfigField)==="function" ? selectionSqlConfigField(selectionArgs, tableAs) : [`${tableAs}.${selectionName}`])
    }

    emit([` as "${selectionAlias||selectionName}"`])

    if(idx < arr.length - 1)
      emit([`, `])
  })

  selectionsExcluded.forEach((e, idx, arr) => {
    let selectionName = e.name.value,
        depsFn = sqlConfigDeps[selectionName],
        selectionArgs = astArguments(e, info),
        deps = depsFn ? depsFn(selectionArgs, tableAs) : {},
        depKeys = Object.keys(deps)

    // prevent duplicate columns
    deps = depKeys.reduce((memo, depKey) => {
      // dependency already exist in selection of query
      if(selections.find(e => e.name.value === depKey))
        return memo

      // add dependency
      return {
        ...memo,
        [depKey]: deps[depKey]
      }
    }, {})

    depKeys = Object.keys(deps)

    if(depKeys.length){

      // does any sql-based selection exist?
      if(selections.length)
        emit([`, `])

      depKeys.forEach((depKey, depIdx, depArr) => {
        let [depExpr,...depParams] = deps[depKey]

        emit([`${depExpr} as "${depKey}"`, ...depParams])

        if(depIdx < depArr.length - 1)
          emit([`, `])
      })

      if(idx < arr.length - 1)
        emit([`, `])
    }


  })

  emit([` from (${relation}) /*${path.join(".")}*/ as ${tableAs}`, ...relationParams])
}

function astArguments(ast, info){
  return ast.arguments.reduce((memo,e) => ({
    ...memo,
    [e.name.value]: convertArgValue(e.value, info),
  }), {})
}

export function parseArgValue({kind,value}){
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

function convertArgValue(e, info){
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
