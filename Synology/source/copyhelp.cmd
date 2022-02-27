cd package/app/.helptoc/Parfenov.AlarmClock.Application

copy helptoc.enu helptoc.chs
copy helptoc.enu helptoc.cht
copy helptoc.enu helptoc.csy
copy helptoc.enu helptoc.dan
copy helptoc.enu helptoc.fre
copy helptoc.enu helptoc.ger
copy helptoc.enu helptoc.hun
copy helptoc.enu helptoc.ita
copy helptoc.enu helptoc.jpn
copy helptoc.enu helptoc.krn
copy helptoc.enu helptoc.nld
copy helptoc.enu helptoc.nor
copy helptoc.enu helptoc.plk
copy helptoc.enu helptoc.ptb
copy helptoc.enu helptoc.ptg
copy helptoc.enu helptoc.rus
copy helptoc.enu helptoc.spn
copy helptoc.enu helptoc.sve
copy helptoc.enu helptoc.trk

cd ../../../../


cd package/app/help

del /Q chs\*.*
mkdir chs
xcopy enu\*.* chs\

del /Q cht\*.*
mkdir cht
xcopy enu\*.* cht\

del /Q csy\*.*
mkdir csy
xcopy enu\*.* csy\

del /Q dan\*.*
mkdir dan
xcopy enu\*.* dan\

del /Q fre\*.*
mkdir fre
xcopy enu\*.* fre\

del /Q ger\*.*
mkdir ger
xcopy enu\*.* ger\

del /Q hun\*.*
mkdir hun
xcopy enu\*.* hun\

del /Q ita\*.*
mkdir ita
xcopy enu\*.* ita\

del /Q jpn\*.*
mkdir jpn
xcopy enu\*.* jpn\

del /Q krn\*.*
mkdir krn
xcopy enu\*.* krn\

del /Q nld\*.*
mkdir nld
xcopy enu\*.* nld\

del /Q nor\*.*
mkdir nor
xcopy enu\*.* nor\

del /Q plk\*.*
mkdir plk
xcopy enu\*.* plk\

del /Q ptb\*.*
mkdir ptb
xcopy enu\*.* ptb\

del /Q ptg\*.*
mkdir ptg
xcopy enu\*.* ptg\

del /Q spn\*.*
mkdir spn
xcopy enu\*.* spn\

del /Q sve\*.*
mkdir sve
xcopy enu\*.* sve\

del /Q trk\*.*
mkdir trk
xcopy enu\*.* trk\

cd ../../../