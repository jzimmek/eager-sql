#!/bin/bash

set -e

pushd ..
yarn run build
yarn pack
popd

PACKAGE_FILE=graphql-pg-`date +%s`.tgz
mv ../graphql-pg-v* $PACKAGE_FILE

yarn add --force ./$PACKAGE_FILE
yarn run start
