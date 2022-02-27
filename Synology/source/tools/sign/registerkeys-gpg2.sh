#!/bin/sh

/opt/bin/gpg2 --homedir /usr/syno/etc/codesign/.gnupg  --import key.pub key.priv

/opt/bin/gpg2 --homedir /usr/syno/etc/codesign/.gnupg  --list-keys

/opt/bin/gpg2 --homedir /usr/syno/etc/codesign/.gnupg  --fingerprint
