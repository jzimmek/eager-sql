# graphql-pg

[![Build Status](https://travis-ci.org/jzimmek/graphql-pg.svg?branch=master)](https://travis-ci.org/jzimmek/graphql-pg)

## Introduction

GraphQL and PostgreSQL are both fantastic technologies and are already used a lot together to build great applications. But it often take a considerable amount of developer time to bring both together in a performant manner due to the compositional nature of GraphQL.

Two problems often arise:

1) sending to many SQL queries over the network, resulting in the N+1 problem
2) more complex and handwritten SQL queries, which will eagerly (over-) fetch data, trying to mitigate the N+1 problem

GraphQL-PG circumvents those problems by pushing down the compositional nature of GraphQL right into PostgreSQL. This is done by transpiling a GraphQL query into a single optimized SQL statement.

## Installation

```
npm install --save graphql-pg
```

## Contribute

### Local setup

#### Checkout project

```
git clone https://github.com/jzimmek/graphql-pg
cd ./graphql-pg
```

#### Install dependencies and build modules

```
for i in . graphiql demo; do
  yarn install
  pushd $i && yarn run build && popd
done
```

#### Setup database for demo application

```
pushd demo && yarn run schema && popd
```

#### Start demo application locally

```
pushd demo && ./local-dev.sh && popd
open http://localhost:3000/
```
