#!/bin/bash

set -e

pushd ..
yarn run build
yarn pack
popd

yarn add ../graphql-pg*
yarn run start
