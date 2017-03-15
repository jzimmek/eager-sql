import {makeExecutableSchema,addResolveFunctionsToSchema} from 'graphql-tools'
import camelize from "camelize"

import {sqlAliasAwareResolvers,createSqlResolve,sql,pagination} from "../../src/index.js" //"eager-sql"

export default ({db,logSql}) => {

  const logger = {log: (e) => console.log(e) }

  let typeDefs = [`
    type Person {
      id: ID!
      name: String!
      friends: [Person]!
      bestFriend: Person
      allFriends(first: Int, last: Int, after: String, before: String): PersonConnection!
    }

    type PersonConnection {
      edges: [PersonEdge]
      pageInfo: PageInfo
    }

    type PersonEdge {
      cursor: String!
      node: Person
    }

    type PageInfo {
      hasNextPage: Boolean!
      hasPreviousPage: Boolean!
      #startCursor: String
      #endCursor: String
    }

    type Query {
      people: [Person]!
      person(id: ID!): Person
    }
  `]

  const sqlResolve = createSqlResolve(
    () => schema,
    (sql, params) => {
      logSql({sql, params})
      return db.raw(sql, params).then(e => camelize(e.rows))
    },
  )

  let resolvers = {
    Person: {
      __sql: {
        fields: {
          allFriends: ({filter,...cursorArgs}, table) => {
            return pagination.cursor(cursorArgs, ([beforeId], [afterId]) => sql`
              select
                p.*,
                row_number() over (order by f.id asc) as "$row_number",
                json_build_array(f.id) as "$cursor"
              from friends f
              join people p
              on
                p.id = f.friend_id
              where
                f.person_id = ${sql.raw(table)}.id
                and (case when cast(${afterId} as integer) is not null then f.id > cast(${afterId} as integer) else true end)
                and (case when cast(${beforeId} as integer) is not null then f.id < cast(${beforeId} as integer) else true end)
            `)
          },
          bestFriend: (args,table) => [`select p.* from friends f join people p on p.id = f.friend_id where f.person_id = ${table}.id order by f.friend_id asc limit 1`],
          friends: (args,table) => [`select p.* from friends f join people p on p.id = f.friend_id where f.person_id = ${table}.id`],
        }
      }
    },
    Query: {
      people: sqlResolve(() => [`select * from people`]),
      person: sqlResolve((obj, {id}) => [`select * from people where id = ?`, id]),
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
