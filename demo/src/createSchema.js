import {makeExecutableSchema} from 'graphql-tools'
import {makeResolverAliasAware,sql,cursor} from "graphql-pg"

export const schemaStr = `
  directive @column (
    name: String!
  ) on FIELD_DEFINITION

  enum PersonStatus {
    GOOD
    BAD
  }

  type Person {
    id: ID! @column
    name: String! @column
    status: PersonStatus @column
    friends: [Person]!
  }

  type Event {
    id: ID! @column
    location: String! @column
  }

  union FeedItem = Person | Event

  interface Pet {
    name: String!
  }

  interface PetWithId {
    id: ID!
  }

  type Cat implements Pet {
    id: ID! @column
    name: String! @column
  }

  type Dog implements Pet, PetWithId {
    id: ID! @column
    name: String! @column
  }












  type Todo {
    id: ID!  @column
    name: String!  @column
  }

  type TodoConnection {
    edges: [TodoEdge]
    pageInfo: PageInfo
  }

  type TodoEdge {
    cursor: String! @column
    node: Todo
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  input TodoConnectionInput {
    first: Int
    last: Int
    after: String
    before: String
  }

  type Query {
    people: [Person]!
    events: [Event]!
    feedItems: [FeedItem]!
    pets: [Pet]!
    todos(input: TodoConnectionInput): TodoConnection!
  }

  input SayHelloInput {
    name: String!
  }

  type Mutation {
    sayHello(input: SayHelloInput!): [Person]!
  }
`

export const selects = {
  Person: {
    friends(_args, {table}){
      return [`select p.* from friends f join people p on p.id = f.friend_id where f.person_id = ${table}.id`]
    }
  },
  Query: {
    todos(args, _ctx){
      return cursor(args.input, ([before], [after]) => {
        return sql`
          select
            t.*,
            row_number() over (order by t.id asc) as "$row_number",
            json_build_array(t.id) as "$cursor"
          from todos t
          where
            coalesce(t.id > cast(${after} as integer), true)
            and coalesce(t.id < cast(${before} as integer), true)
        `
      })

    },
    feedItems(_args, _ctx){
      return {
        types: {
          "Person": ["select * from people"],
          "Event": ["select * from events"],
        }
      }
    },
    people(_args, _ctx){
      return ["select * from people"]
    },
    events(_args, _ctx){
      return ["select * from events"]
    },
    pets(){
      return {
        types: {
          Cat: [`select 1 as id, 'cat1' as name`],
          Dog: [`select 2 as id, 'dog2' as name`],
        }
      }
    }
  },
  Mutation: {
    sayHello(_args, _ctx){
      return ["select * from people"]
    }
  },
}

export default () => {
  const schema = makeExecutableSchema({
    typeDefs: [schemaStr],
    resolvers: {
      FeedItem: {
        __resolveType(obj){
          return obj.type
        }
      },
      Pet: {
        __resolveType(obj){
          return obj.type
        }
      },
      Query: {
        // pets(){
        //   return [
        //     {id: "1", type: "Cat", name: "cat1"},
        //     {id: "2", type: "Dog", name: "dog2"},
        //   ]
        // },
      //   feedItems(){
      //     return [
      //       {id: 1, type: "Person", name: "joe"},
      //       {id: 2, type: "Event", location: "blub"},
      //     ]
      //   }
      },
      Mutation: {
        sayHello({sqlResolve}, {input:{name}}, _ctx, _info){
          // console.info("info", JSON.stringify(info,null,2))

          console.info(`hello ${name}`)
          return sqlResolve()
        }
      }
    },
  })

  makeResolverAliasAware(schema)

  return schema
}
