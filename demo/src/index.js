import pg from "pg"
pg.types.setTypeParser(20, 'text', parseInt)

import path from "path"
import knex from "knex"
import express from "express"

import compression from "compression"
import bodyParser from 'body-parser'
import cookieParser from "cookie-parser"

import {graphqlExpress} from 'graphql-server-express'
import createSchema from "./createSchema"

import {eagerSqlContext}  from "eager-sql/lib"

process.on("unhandledRejection", (reason, _promise) => console.info("unhandledRejection", reason))

const isDev = process.env.NODE_ENV === "development"

if(isDev)
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

const db = knex({
  debug: true,
  client: "pg",
  connection: process.env.DATABASE_URL,
  pool: {
    min: 10,
    max: 10
  }
})

const app = express()

app.use(express.static(path.resolve(__dirname, "..", "..", "graphiql", "build")))

app.use(compression())
app.use(bodyParser.json({limit: "5000kb"}))
app.use(bodyParser.urlencoded({extended: true}))
app.use(cookieParser())

const schema = createSchema()

app.use("/graphql", graphqlExpress((req, res) => {
  return {
    schema,
    context: {
      eagerSql: eagerSqlContext({db,res})
    }
  }
}))

app.listen(process.env.PORT)

console.info(`server listening on ${process.env.PORT}`)
