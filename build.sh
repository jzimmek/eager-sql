#!/bin/bash

set -e

npm install

node_modules/babel-cli/bin/babel.js src -d lib

npm link

pushd graphiql && npm install && npm run build; popd
pushd demo && npm install && npm link graphql-pg; popd
