/*global test expect*/

import {parse,Source} from 'graphql'

import {makeExecutableSchema,addResolveFunctionsToSchema} from 'graphql-tools'

import simpleResolveSQLParts from "./simpleResolveSQLParts"
import parseArgValue from "./parseArgValue"

//
// let createResolveOne = null

let resolvers = {
  Query: {
    // viewer: (...args) => createResolveOne(...args),
    __sql: {
      fields: {
        viewer: (args) => [`select * from organisations where id = ?`, args.name]
      }
    }
  },
  Viewer: {
    niceName: (obj) => `*** ${obj.name} ***`,
    niceName2: (obj) => `*** ${obj.name} ***`,
    __sql: {
      deps: {
        niceName: ["name"],
        niceName2: ["name"],
      },
      fields: {
        niceName: false,
        columnAlias: "column",
        camelCase: (args, table) => [`${table}.camel_case`],
        profile: (args, table) => [`select * from profile where viewer_id = ${table}.id`],
        awards: (args, table) => [`select * from awards where viewer_id = ${table}.id`],
        languages: (_args, _table) => ({
          LanguageA: [`select *, 'LanguageA' as "$type" from languages`],
          LanguageB: [`select *, 'LanguageB' as "$type" from languages`],
        }),
        languagesUnion: (_args, _table) => ({
          LanguageA: [`select *, 'LanguageA' as "$type" from languages`],
          LanguageB: [`select *, 'LanguageB' as "$type" from languages`],
        }),
      }
    }
  },
  Profile: {
    __sql: {}
  },
  Award: {
    __sql: {}
  },
  LanguageA: {
    __sql: {}
  },
  LanguageB: {
    __sql: {}
  }
}

let schema = makeExecutableSchema({
  typeDefs: [`
    interface Language {
      name: String
    }
    type LanguageA implements Language {
      name: String
      languageAField: String
    }
    type LanguageB implements Language {
      name: String
      languageBField: String
    }
    union LanguageUnion = LanguageA | LanguageB
    type Award {
      name: String
    }
    type Viewer {
      id: ID
      columnAlias: String
      name: String
      niceName: String
      niceName2: String
      camelCase: String
      profile: Profile
      awards: [Award]
      languages: [Language]
      languagesUnion: [LanguageUnion]
    }
    type Profile {
      url: String
    }
    type Query {
      viewer(name: ID): Viewer
    }
    schema {
      query: Query
    }
  `],
  resolvers: resolvers,
  allowUndefinedInResolve: false, // optional
  resolverValidationOptions: {}, // optional
})

let typeResolvers = {
  Language: {
    __resolveType(obj){
      return obj.$type
    }
  },
  LanguageUnion: {
    __resolveType(obj){
      return obj.$type
    }
  },
}

addResolveFunctionsToSchema(schema, typeResolvers)

// addResolveFunctionsToSchema(
//   schema,
//   createSQLResolvers(schema),
// )

// createResolveOne = createResolve(schema, resolvers, (sql, params) => {
//   return {sql,params}
// })

function runResolve(query, args={}){
  const documentAST = parse(new Source(query))

  let [selection] = documentAST.definitions[0].selectionSet.selections

  let values = {
    ...selection.arguments.filter(e => e.value.kind !== "Variable").reduce((memo,e) => ({[e.name.value]: parseArgValue(e.value)}), {}),
    ...selection.arguments.filter(e => e.value.kind === "Variable").reduce((memo,e) => ({[e.name.value]: args[e.value.name.value]}), {}),
  }
  let info = {
    fieldNodes: [
      selection
    ],
    returnType: schema.getType("Viewer"),
    variableValues: args
  }

  let {sql,params} = simpleResolveSQLParts([`select * from organisations where id = ?`, values.name], schema, info)

  return {
    sql: format(sql),
    params,
  }
}

function format(sql){
  return sql
    .replace(/\n/g, " ")
    .replace(/=/g, " = ")
    .replace(/,/g, " , ")
    .replace(/\(/g, " ( ")
    .replace(/\)/g, " ) ")
    .replace(/[ ]+/g, " ")
    .split(" ")
    .map(e => e.trim())
    .filter( e => e.length)
    .join(" ")
}

test("field without argument", () => {
  let res = runResolve(`{
    viewer {
      id
    }
  }`)

  expect(res).toEqual({
    params: [undefined],
    sql: format(`
      select
        viewer.id as "id"
      from (select * from organisations where id = ?) /*viewer*/ as viewer
    `)
  })
})

test("field with aliased column", () => {
  let res = runResolve(`{
    viewer {
      columnAlias
    }
  }`)

  expect(res).toEqual({
    params: [undefined],
    sql: format(`
      select
        viewer.column as "columnAlias"
      from (select * from organisations where id = ?) /*viewer*/ as viewer
    `)
  })
})


test("field with argument, static values", () => {
  let res = runResolve(`{
    viewer(name: "joe") {
      id
    }
  }`)

  expect(res).toEqual({
    params: ["joe"],
    sql: format(`
      select
        viewer.id as "id"
      from (select * from organisations where id = ?) /*viewer*/ as viewer
    `)
  })
})

test("dynamic field expression", () => {
  let res = runResolve(`{
    viewer {
      camelCase
    }
  }`)

  expect(res).toEqual({
    params: [undefined],
    sql: format(`
      select
        viewer.camel_case as "camelCase"
      from (select * from organisations where id = ?) /*viewer*/ as viewer
    `)
  })
})

test("field with argument, variable values", () => {
  let res = runResolve(`query($myName: ID) {
    viewer(name: $myName) {
      id
    }
  }`, {
    myName: "joe"
  })

  expect(res).toEqual({
    params: ["joe"],
    sql: format(`
      select
        viewer.id as "id"
      from (select * from organisations where id = ?) /*viewer*/ as viewer
    `)
  })
})

test("multiple fields", () => {
  let res = runResolve(`{
    viewer(name: "joe") {
      id
      name
    }
  }`)

  expect(res).toEqual({
    params: ["joe"],
    sql: format(`
      select
        viewer.id as "id",
        viewer.name as "name"
      from (select * from organisations where id = ?) /*viewer*/ as viewer
    `)
  })
})

test("aliased field without argument", () => {
  let res = runResolve(`{
    alias: viewer {
      id
    }
  }`)

  expect(res).toEqual({
    params: [undefined],
    sql: format(`
      select
        viewer.id as "id"
      from (select * from organisations where id = ?) /*viewer*/ as viewer
    `)
  })
})

test("aliased field with argument, static value", () => {
  let res = runResolve(`{
    alias: viewer(name: "joe") {
      id
    }
  }`)

  expect(res).toEqual({
    params: ["joe"],
    sql: format(`
      select
        viewer.id as "id"
      from (select * from organisations where id = ?) /*viewer*/ as viewer
    `)
  })
})

test("aliased field with argument, variable value", () => {
  let res = runResolve(`query($myName: ID) {
    alias: viewer(name: $myName) {
      id
    }
  }`, {
    myName: "joe"
  })

  expect(res).toEqual({
    params: ["joe"],
    sql: format(`
      select
        viewer.id as "id"
      from (select * from organisations where id = ?) /*viewer*/ as viewer
    `)
  })
})

test("nested field", () => {
  let res = runResolve(`{
    viewer {
      profile {
        url
      }
    }
  }`)

  expect(res).toEqual({
    params: [undefined],
    sql: format(`
      select profile.to_json as "profile"
      from ( select *
          from organisations
          where id = ? )
        /*viewer*/
        as viewer
      left join lateral (
        ( select to_json ( x )
          from ( select profile.url as "url"
              from ( select *
                  from profile
                  where viewer_id = viewer.id )
                /*viewer.profile*/
                as profile ) x ) ) as profile on true
    `)
  })
})

test("scalar field and nested field", () => {
  let res = runResolve(`{
    viewer {
      id
      profile {
        url
      }
    }
  }`)

  expect(res).toEqual({
    params: [undefined],
    sql: format(`
      select viewer.id as "id" ,
        profile.to_json as "profile"
      from ( select *
          from organisations
          where id = ? )
        /*viewer*/
        as viewer
      left join lateral (
        ( select to_json ( x )
          from ( select profile.url as "url"
              from ( select *
                  from profile
                  where viewer_id = viewer.id )
                /*viewer.profile*/
                as profile ) x ) ) as profile on true
    `)
  })
})


test("GraphQLList field", () => {
  let res = runResolve(`{
    viewer {
      id
      awards {
        name
      }
    }
  }`)

  expect(res).toEqual({
    params: [undefined],
    sql: format(`
      select viewer.id as "id" ,
        awards.json_agg as "awards"
      from ( select *
          from organisations
          where id = ? )
        /*viewer*/
        as viewer
      left join lateral (
        ( select json_agg ( x )
          from ( select award.name as "name"
              from ( select *
                  from awards
                  where viewer_id = viewer.id )
                /*viewer.awards*/
                as award ) x ) ) as awards on true
    `)
  })
})

test("GraphQLInterfaceType field with $type column", () => {
  let res = runResolve(`{
    viewer {
      id
      languages {
        name
        ... on LanguageA {
          languageAField
        }
        ... on LanguageB {
          languageBField
        }
      }
    }
  }`)

  expect(res).toEqual({
    params: [undefined],
    sql: format(`
      select viewer.id as "id" ,
        languages.json_agg as "languages"
      from ( select *
          from organisations
          where id = ? )
        /*viewer*/
        as viewer
      left join lateral (
        ( select json_agg ( x )
          from (
            ( select to_json ( x ) as x
              from ( select coalesce ( to_json ( languagea.* ) ->> '$type' , 'LanguageA' ) as "$type" ,
                    languagea.name as "name" ,
                    languagea.languageAField as "languageAField"
                  from ( select * ,
                        'LanguageA' as "$type"
                      from languages )
                    /*viewer.languages*/
                    as languagea ) x )
          union all
            ( select to_json ( x ) as x
              from ( select coalesce ( to_json ( languageb.* ) ->> '$type' , 'LanguageB' ) as "$type" ,
                    languageb.name as "name" ,
                    languageb.languageBField as "languageBField"
                  from ( select * ,
                        'LanguageB' as "$type"
                      from languages )
                    /*viewer.languages*/
                    as languageb ) x ) ) x ) ) as languages on true
    `)
  })
})

test("GraphQLUnionType field", () => {
  let res = runResolve(`{
    viewer {
      id
      languagesUnion {
        ... on LanguageA {
          languageAField
        }
        ... on LanguageB {
          languageBField
        }
      }
    }
  }`)

  expect(res).toEqual({
    params: [undefined],
    sql: format(`
      select viewer.id as "id" ,
        languagesUnion.json_agg as "languagesUnion"
      from ( select *
          from organisations
          where id = ? )
        /*viewer*/
        as viewer
      left join lateral (
        ( select json_agg ( x )
          from (
            ( select to_json ( x ) as x
              from ( select coalesce ( to_json ( languagea.* ) ->> '$type' , 'LanguageA' ) as "$type" ,
                    languagea.languageAField as "languageAField"
                  from ( select * ,
                        'LanguageA' as "$type"
                      from languages )
                    /*viewer.languagesUnion*/
                    as languagea ) x )
          union all
            ( select to_json ( x ) as x
              from ( select coalesce ( to_json ( languageb.* ) ->> '$type' , 'LanguageB' ) as "$type" ,
                    languageb.languageBField as "languageBField"
                  from ( select * ,
                        'LanguageB' as "$type"
                      from languages )
                    /*viewer.languagesUnion*/
                    as languageb ) x ) ) x ) ) as languagesUnion on true
    `)
  })
})

test("non sql-field with deps", () => {
  let res = runResolve(`{
    viewer {
      niceName
    }
  }`)

  expect(res).toEqual({
    params: [undefined],
    sql: format(`
      select
        viewer.name as "name"
      from (select * from organisations where id = ?) /*viewer*/ as viewer
    `)
  })
})

test("non sql-field with deps, implicit sql config field exclude", () => {
  let res = runResolve(`{
    viewer {
      niceName2
    }
  }`)

  expect(res).toEqual({
    params: [undefined],
    sql: format(`
      select
        viewer.name as "name"
      from (select * from organisations where id = ?) /*viewer*/ as viewer
    `)
  })
})
