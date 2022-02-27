"c:\Program Files (x86)\Windows Kits\10\bin\x64\pvk2pfx" -pvk wincert.pvk -pi xxxxxx -spc wincert.cer -pfx wincert.pfx -po xxxxxx

certutil -user -p xxxxxx -importPFX wincert.pfx