import "isomorphic-fetch"

import pg from "pg"
pg.types.setTypeParser(20, 'text', parseInt)

import knex from "knex"
import express from "express"

import compression from "compression"
import bodyParser from 'body-parser'
import cookieParser from "cookie-parser"

import {graphiqlExpress} from 'graphql-server-express'
import { runHttpQuery } from 'graphql-server-core'

import createSchema from "./createSchema"

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

app.use(express.static("public"))

app.use(compression())
app.use(bodyParser.json({limit: "5000kb"}))
app.use(bodyParser.urlencoded({extended: true}))
app.use(cookieParser())

app.use('/graphiql', graphiqlExpress({endpointURL: '/graphql'}))

app.use("/graphql", bodyParser.json(), (req,res) => {
  // let schema = createSchema({db})
  // graphqlExpress({schema})(req,res)

  const logSql = ({sql,params}) => {
    res.setHeader('x-sql', encodeURIComponent(sql))
    res.setHeader('x-sql-params', encodeURIComponent(JSON.stringify(params)))
  }

  runHttpQuery([req, res], {
    method: req.method,
    options: {
      schema: createSchema({db,logSql})
    },
    query: req.method === 'POST' ? req.body : req.query,
  }).then((gqlResponse) => {
    res.setHeader('Content-Type', 'application/json')
    res.write(gqlResponse)
    res.end()
  }, (error) => {
    if ( 'HttpQueryError' !== error.name ) {
      throw error
    }

    if ( error.headers ) {
      Object.keys(error.headers).forEach((header) => {
        res.setHeader(header, error.headers[header])
      })
    }

    res.statusCode = error.statusCode
    res.write(error.message)
    res.end()
  })

})

app.listen(process.env.PORT)

console.info(`server listening on ${process.env.PORT}`)
