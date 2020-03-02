#!/usr/bin/env bash

commitMessage=$1
if [ -z "$commitMessage" ]; then
  echo usage: ./build.sh "commit message"
  exit 1
fi

dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd $dir || exit 1

./increment-version.sh -m1 $(cat $dir/version.txt) >$dir/version.txt
version=$(cat $dir/version.txt)
echo $VERSION

headersTmpFile=$dir/headers.tmp.js
sed -e "s/{{version}}/$version/" $dir/headers.js >$headersTmpFile

publicTarget=$dir/build/favro-toggl.user.js
echo '// ==UserScript==' >$publicTarget
echo '// @name         Favro - Toggl Timer' >>$publicTarget
cat $headersTmpFile >>$publicTarget
echo '// ==/UserScript==' >>$publicTarget
cat ./script.js >>$publicTarget

localTarget=$dir/build/favro-toggl.local.user.js
echo '// ==UserScript==' >$localTarget
echo '// @name         Favro - Toggl Timer LOCAL' >>$localTarget
cat $headersTmpFile >>$localTarget
echo "// @require      file://${dir}/script.js" >>$localTarget
echo '// ==/UserScript==' >>$localTarget

readmeTarget=$dir/build/README.md
cat $dir/README.md >$readmeTarget
cat $dir/storage.json >>$readmeTarget

rm $headersTmpFile

git add .
git commit -m $commitMessage
git push
