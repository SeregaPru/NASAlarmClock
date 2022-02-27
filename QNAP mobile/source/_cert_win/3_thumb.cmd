powershell -Command " & {dir -path cert:\LocalMachine\My | where { $_.Subject -like \"*wincert*\" }}"

powershell -Command " & {dir -path cert:\LocalMachine }" > a1

powershell -Command " & {dir -path cert:\LocalMachine\My }"