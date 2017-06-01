import pg from "pg"
pg.types.setTypeParser(20, 'text', parseInt)

import path from "path"
import knex from "knex"
import express from "express"

import compression from "compression"
import bodyParser from 'body-parser'
import cookieParser from "cookie-parser"

import graphqlHTTP from "express-graphql"

import createSchema, {selects} from "./createSchema"

import {createRootResolve} from "graphql-pg"

process.on("unhandledRejection", (reason, _promise) => console.info("unhandledRejection", reason))

const isDev = process.env.NODE_ENV === "development"

if(isDev)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const db = knex({
  debug: true,
  client: "pg",
  connection: process.env.DATABASE_URL,
  pool: {
    min: 1,
    max: 1
  }
})

const app = express()

app.use(express.static(path.resolve(__dirname, "..", "node_modules", "graphql-pg", "graphiql", "build")))

app.use(compression())
app.use(bodyParser.json({limit: "5000kb"}))
app.use(bodyParser.urlencoded({extended: true}))
app.use(cookieParser())

const schema = createSchema()

app.use('/graphql', graphqlHTTP(async (req, res, {query,variables}) => {
  let rootValue

  if(query){
    rootValue = await createRootResolve({
      db,
      schema,
      selects,
      query,
      variables,
      dbMerge: true,
      log: (sql,params) => {
        res.setHeader('x-sql', encodeURIComponent(sql))
        res.setHeader('x-sql-params', encodeURIComponent(JSON.stringify(params)))
      }
    })
  }

  return {
    schema,
    rootValue,
    graphiql: false
  }
}))

app.listen(process.env.PORT)

console.info(`server listening on ${process.env.PORT}`)
