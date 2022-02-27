#!/bin/sh

cp -r -v /share/CACHEDEV1_DATA/.qpkg/AlarmClock/web ./shared/


find ./shared/ -name *.css |
while read filename
do
    echo $filename
    mv "$filename" "$filename.orig"
    ./tools/rcssmin-1.0.6/rcssmin.py < "$filename.orig" > "$filename"
done


find ./shared/ -name "*.bak" -type f -print0 | xargs -0 /bin/rm -f
find ./shared/ -name "*.pyc" -type f -print0 | xargs -0 /bin/rm -f
find ./shared/ -name "*.orig" -type f -print0 | xargs -0 /bin/rm -f

