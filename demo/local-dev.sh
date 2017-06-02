#!/bin/bash

set -x
set -e

function finish {
  [ -d ../node_modules/graphql-bak ] && mv ../node_modules/graphql-bak ../node_modules/graphql
}

trap finish EXIT

pushd ..
yarn run build
popd

[ -d ../node_modules/graphql ] && mv ../node_modules/graphql ../node_modules/graphql-bak

[ -L ./node_modules/graphql-pg ] || yarn link graphql-pg

yarn run start
