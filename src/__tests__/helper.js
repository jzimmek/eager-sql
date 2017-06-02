import pg from "pg"
pg.types.setTypeParser(20, 'text', parseInt)

import {graphql} from "graphql"
import gql from "graphql-tag"

import {makeExecutableSchema} from 'graphql-tools'
import {createRootResolve,makeResolverAliasAware} from "../index"

export function connectDb(){
  return pg.Client(process.env.DATABASE_URL)
}

export async function runQuery(client, opts, {query,variables={}}){
  const {dbClean="", dbSchema, graphqlSchema, resolvers={}, contextValue={}, selects} = opts

  try{
    const client = await new Promise((resolve,reject) => {
      const c = new pg.Client(process.env.DATABASE_URL)
      c.connect((err) => {
        if(err)
          return reject(err)

        resolve(c)
      })
    })

    const schema = makeExecutableSchema({
      typeDefs: [graphqlSchema],
      resolvers,
    })

    makeResolverAliasAware(schema)

    await client.query(`
      begin;
      create extension if not exists "pgcrypto";
      create extension if not exists "plv8";
      ${dbClean}
      ${dbSchema}
      commit;
    `).promise()

    gql.resetCaches()

    const rootValue = await createRootResolve({
      execQuery: (sql,params) => client.query(sql,params).promise(),
      schema, 
      selects,
      contextValue,
      query,
      variables,
      dbMerge: true
    })

    const res = await graphql(schema, query, rootValue, contextValue, variables)

    if(dbClean)
      await client.query(dbClean).promise()

    client.end()

    if(res.errors){
      console.error(res.errors)
      throw new Error(res.errors)
    }

    return res.data
  }catch(err){
    console.error("ERR", err)
    throw err
  }
}
