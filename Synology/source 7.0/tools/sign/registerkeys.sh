#!/bin/sh

gpg --homedir /usr/syno/etc/codesign/.gnupg  --import key.pub key.priv

gpg --homedir /usr/syno/etc/codesign/.gnupg  --list-keys

gpg --homedir /usr/syno/etc/codesign/.gnupg  --fingerprint
