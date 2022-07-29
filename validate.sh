#!/bin/bash
set +e

exit_code=0

function validate() {
  file="$1"

  message=$(ajv validate -d $file -s $(cat $file | jq -r '.["$schema"]') 2>&1)

  if ! [ $? -eq 0 ];
  then
    exit_code=1

    first_line=$(echo "$message" | head -n 1)
    rest=$(echo "$message" | tail -n +2)

    echo "❌ ${first_line}"
    echo "${rest}"
  else
    echo "✅ ${message}"
  fi
}

# Subjects & index
echo "Subjects & index"
for file in *.json; do
  validate $file
done

# Overrides
cd overrides

echo ""
echo "Overrides"
for file in *.json; do
  validate $file
done

echo ""
if ! [ $exit_code -eq 0 ];
then
  echo "====== ❌ Check failed ======"
else
  echo "==== ✅ Check successful ===="
fi

exit $exit_code

