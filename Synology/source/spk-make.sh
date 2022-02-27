#!/bin/sh

rm *.spk
rm *.tgz

find ./package/ -name "*.bak"  -type f -print0 | xargs -0 /bin/rm -f
find ./package/ -name "*.pyc"  -type f -print0 | xargs -0 /bin/rm -f
find ./package/ -name "*.orig" -type f -print0 | xargs -0 /bin/rm -f

find ./package/ -name "*"     -type f -print0 | xargs -0 /bin/chmod 644
find ./package/ -name "*.cgi" -type f -print0 | xargs -0 /bin/chmod 755


cd ./package
tar -c -f ../package.tar etc app indexdb
gzip -9 ../package.tar
cd ..

rm package.tar
mv package.tar.gz package.tgz


ver=`perl -ne 'while(m/^version="([^"]+)"/g){print "$1\n";}' INFO`
echo $ver

pkgname="AlarmClock-$ver.spk"
echo $pkgname


chmod 644 package.tgz
chmod 644 INFO

tar -c -f $pkgname INFO package.tgz scripts
rm package.tgz


php ./tools/sign/CodeSign2.php --sign $pkgname
mv $pkgname unsigned-$pkgname
mv signed_$pkgname $pkgname
cp $pkgname $pkgname.tgz

#rm new_AlarmClock.spk
