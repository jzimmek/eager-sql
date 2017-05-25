import pg from "pg"
pg.types.setTypeParser(20, 'text', parseInt)

import knex from "knex"

import {graphql} from "graphql"
import gql from "graphql-tag"

import {makeExecutableSchema} from 'graphql-tools'
import {createRootResolve,makeResolverAliasAware} from "../index"

export function connectDb(){
  return knex({
    client: "pg",
    connection: process.env.DATABASE_URL,
    pool: {
      min: 1,
      max: 1
    }
  })
}

export async function runQuery(db, opts, {query,variables={}}){
  const {dbClean="", dbSchema, graphqlSchema, resolvers={}, contextValue={}, selects} = opts

  try{

    const schema = makeExecutableSchema({
      typeDefs: [graphqlSchema],
      resolvers,
    })

    makeResolverAliasAware(schema)

    await db.raw(`
      begin;
      create extension if not exists "pgcrypto";
      ${dbClean}
      ${dbSchema}
      commit;
    `)

    gql.resetCaches()

    const rootValue = await createRootResolve({db, schema, selects, schemaStr: graphqlSchema, contextValue, query, variables})

    const res = await graphql(schema, query, rootValue, contextValue, variables)

    if(dbClean)
      await db.raw(dbClean)

    if(res.errors){
      console.error(res.errors)
      throw new Error("graphql errors")
    }

    return res.data
  }catch(err){
    console.error("ERR", err)
    throw err
  }
}
