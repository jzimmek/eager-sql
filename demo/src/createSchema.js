import {makeExecutableSchema} from 'graphql-tools'
import {makeResolverAliasAware,sql,cursor} from "graphql-pg"

const schemaStr = `
  type Person {
    id: ID!
    name: String!
    species: Species!
  }

  interface Character {
    id: ID!
    name: String!
    species: Species!
  }

  type AliveCharacter implements Character {
    id: ID!
    name: String!
    hairColor: String!
    children: [AliveCharacter]!
    species: Species!
  }

  type DroidCharacter implements Character {
    id: ID!
    name: String!
    mass: String!
    species: Species!
  }

  union Actor = AliveCharacter | DroidCharacter

  type Species {
    id: ID!
    name: String!
  }

  type Film {
    id: ID!
    name: String!
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
  }

  type Query {
    actors: [Actor]!
    characters: [Character]!
    people: [Person]!
    peopleConnection(first: Int, last: Int, after: String, before: String): PersonConnection!
    species: [Species]!
    films: [Film]!
  }
`


export const selects = {
  Person: {
    species(_args, {table}){
      return sql`select * from species where id = ${sql.raw(table)}.species_id`
    }
  },
  DroidCharacter: {
    species(_args, {table}){
      return sql`select * from species where id = ${sql.raw(table)}.species_id`
    },
  },
  AliveCharacter: {
    species(_args, {table}){
      return sql`select * from species where id = ${sql.raw(table)}.species_id`
    },
    children(_args, {table}){
      return sql`
        select
          p.*
        from people_children pc
        join people p on p.id = pc.child_id
        where
          pc.parent_id = ${sql.raw(table)}.id
      `
    },
  },
  Query: {
    actors(){
      return {
        types: {
          AliveCharacter: sql`select * from people where species_id in (1,2)`,
          DroidCharacter: sql`select * from people where species_id = 3`,
        }
      }
    },
    characters(){
      return {
        types: {
          AliveCharacter: sql`select * from people where species_id in (1,2)`,
          DroidCharacter: sql`select * from people where species_id = 3`,
        }
      }
    },
    people(_args, _ctx){
      return sql`select * from people`
    },
    species(_args, _ctx){
      return sql`select * from species`
    },
    films(_args, _ctx){
      return sql`select * from films`
    },
    peopleConnection(args,_ctx){
      return cursor(args, ([before], [after]) => {
        return sql`
          select
            t.*,
            row_number() over (order by t.id asc) as "$row_number",
            json_build_array(t.id) as "$cursor"
          from people t
          where
            coalesce(t.id > cast(${after} as integer), true)
            and coalesce(t.id < cast(${before} as integer), true)
        `
      })
    }
  },
}

export default () => {
  const schema = makeExecutableSchema({
    typeDefs: [schemaStr],
    resolvers: {
      Query: {},
      Actor: {
        __resolveType: (obj) => obj.type
      },
      Character: {
        __resolveType: (obj) => obj.type
      },
    },
  })

  makeResolverAliasAware(schema)

  return schema
}
