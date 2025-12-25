#!/bin/bash

set -e

rm -rf dist
mkdir -p dist
cp -a ../images ./dist
find ../ -maxdepth 1 -name "*.json" -exec cp -a {} ./dist \;

bun run implodeOverrides

cp -a ./public/. ./dist/
