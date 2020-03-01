dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
publicTarget=$dir/build/favro-toggl.user.js
localTarget=$dir/build/favro-toggl.local.user.js

echo '// ==UserScript==' > $publicTarget
echo '// @name         Favro - Toggl Timer' >> $publicTarget
cat ./headers.js >> $publicTarget
echo '// ==/UserScript==' >> $publicTarget
cat ./script.js >> $publicTarget

echo '// ==UserScript==' > $localTarget
echo '// @name         Favro - Toggl Timer LOCAL' >> $localTarget
cat ./headers.js >> $localTarget
echo "// @require      file://${dir}/script.js" >> $localTarget
echo '// ==/UserScript==' >> $localTarget


