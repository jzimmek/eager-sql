import {makeExecutableSchema,addResolveFunctionsToSchema} from 'graphql-tools'
import camelize from "camelize"

import {sqlAliasAwareResolvers,createSqlResolve} from "../../src/index.js" //"eager-sql"

export default ({db,logSql}) => {

  const logger = {log: (e) => console.log(e) }

  let typeDefs = [`
    type Person {
      id: ID!
      name: String!
      friends: [Person]!
      bestFriend: Person
    }

    type Query {
      people: [Person]!
    }
  `]

  const sqlResolve = createSqlResolve(
    () => schema,
    (sql, params) => {
      logSql({
        sql,
        params: JSON.stringify(params)
      })
      return db.raw(sql, params).then(e => camelize(e.rows))
    },
  )

  let resolvers = {
    Person: {
      __sql: {
        fields: {
          bestFriend: (args,table) => [`select p.* from friends f join people p on p.id = f.friend_id where f.person_id = ${table}.id order by f.friend_id asc limit 1`],
          friends: (args,table) => [`select p.* from friends f join people p on p.id = f.friend_id where f.person_id = ${table}.id`],
        }
      }
    },
    Query: {
      people: sqlResolve(() => [`select * from people`])
    }
  }


  let schema = makeExecutableSchema({
    typeDefs,
    resolvers,
    logger,
    allowUndefinedInResolve: false,
    resolverValidationOptions: {},
  })

  // addResolveFunctionsToSchema(schema, typeResolvers)

  addResolveFunctionsToSchema(schema, sqlAliasAwareResolvers(schema))

  return schema
}
