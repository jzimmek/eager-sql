import pg from "pg"
pg.types.setTypeParser(20, 'text', parseInt)
import path from "path"
import url from "url"
import express from "express"
import compression from "compression"
import bodyParser from 'body-parser'
import cookieParser from "cookie-parser"
import graphqlHTTP from "express-graphql"
import {createRootResolve} from "graphql-pg"

import createSchema, {selects} from "./createSchema"

const params = url.parse(process.env.DATABASE_URL),
      auth = params.auth.split(':'),
      pool = new pg.Pool({
        user: auth[0],
        password: auth[1],
        host: params.hostname,
        port: params.port,
        database: params.pathname.split('/')[1],
        ssl: false
      }),
      app = express(),
      schema = createSchema()

app.use(express.static(path.resolve(__dirname, "..", "node_modules", "graphql-pg", "graphiql", "build")))
app.use(compression())
app.use(bodyParser.json({limit: "5000kb"}))
app.use(bodyParser.urlencoded({extended: true}))
app.use(cookieParser())

app.use('/graphql', graphqlHTTP(async (req, res, {query,variables}) => {
  try{
    const rootValue = query ? await createRootResolve({
      execQuery: (sql,params) => pool.query(sql,params),
      schema,
      selects,
      query,
      variables,
      dbMerge: process.env.GRAPHQL_PG_DB_MERGE === "true",
      log: (sql,params) => {
        res.setHeader('x-sql', encodeURIComponent(sql))
        res.setHeader('x-sql-params', encodeURIComponent(JSON.stringify(params)))
      }
    }) : {}

    return {
      schema,
      rootValue,
      graphiql: false
    }
  }catch(err){
    console.info("ERR", err)
    throw err
  }
}))

app.listen(process.env.PORT)

console.info(`server listening on ${process.env.PORT}`)
