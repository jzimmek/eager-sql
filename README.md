# graphql-pg

[![Build Status](https://travis-ci.org/jzimmek/graphql-pg.svg?branch=master)](https://travis-ci.org/jzimmek/graphql-pg)

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
