<?php
ini_set("memory_limit", -1);
define("CODESIGN_DIR", "/usr/syno/etc/codesign");
define("CURR_DIR", getcwd());
#define("GPG", "/usr/local/gnupg/bin/gpg2");
define("GPG", "/opt/bin/gpg2");
#define("GPG", "/usr/bin/gpg");
define("GPGHOME", CODESIGN_DIR . "/.gnupg");
define("GPGCMD", GPG . " --ignore-time-conflict --ignore-valid-from --yes --batch --homedir " . GPGHOME);
//define("GPGCMD", GPG . " --ignore-time-conflict --ignore-valid-from --yes --batch ");
define("KEYRING", "keyring");
define("KEYINFO_SYS", "keyinfo-sys");
define("KEYINFO_USER", "keyinfo-user");
define("DEV_KEY_FPR", "706BB70D38DFF4BA5A0E8A165695FF072786ECAF");
define("KEYSERVER", "http://keymaker.synology.com");
define("TIMESERVER", "http://timestamp.synology.com");
define("ALL_FILES", "cat_all_files");
define("SIG_FILE", "syno_signature");
define("SIG_STATUS_FILE", "signature_status_file");
define("TOKEN_FILE", "syno_signature.asc");
define("TOKEN_STATUS_FILE", "token_status_file");
define("MIN_UPDATE_INTERVAL_SEC", 5 * 60);
define("VERSION", "VERSION");
define("KEY_TYPE_TIMESTAMP", 0);
define("KEY_TYPE_DEVELOP", 1);
define("KEY_TYPE_3RDPARTY", 2);
define("KEY_TYPE_OFFICIAL", 3);
$cmd = "/usr/syno/bin/servicetool --get-alive-internal-volume";
exec($cmd, $volume, $ret);

if (1 == $ret) {
	define("TMP_DIR", $volume[0] . "/@tmp");
}
else {
	define("TMP_DIR", "/tmp");
}

$suffix = empty($argv[2]) ? microtime(true) : basename($argv[2]);
define("WORK_DIR", TMP_DIR . "/codesign_$suffix");

function RmWorkDir()
{
	exec("rm -rf " . escapeshellarg(WORK_DIR));
}

function Debug($msg)
{
	echo "$msg \n";
}

function ErrorLog($err_msg)
{
	//$logmsg = print_r($err_msg, true);
	$logmsg = $err_msg;
	
	echo "== ErrorLog: $logmsg \n";
	exec("logger -p user.err -t codesign.php $logmsg");
}

function ListAllFiles($dir)
{
	$result = array();
	foreach(scandir($dir) as $val) {
		if ('.' == $val || '..' == $val) {
			continue;
		}

		if (is_dir($dir . DIRECTORY_SEPARATOR . $val)) {
			$result = array_merge($result, ListAllFiles($dir . DIRECTORY_SEPARATOR . $val));
		}
		else {
			$result[] = $dir . DIRECTORY_SEPARATOR . $val;
		}
	}

	return $result;
}

function CatAllFiles()
{
	$ret = - 1;
	$allfiles = ListAllFiles(WORK_DIR);
	$fh = fopen(WORK_DIR . DIRECTORY_SEPARATOR . ALL_FILES, 'w');
	if (false === sort($allfiles, SORT_STRING)) {
		goto End;
	}

	foreach($allfiles as $file) {
		if (false === ($str = file_get_contents($file))) {
			goto End;
		}

		if (false === fwrite($fh, $str)) {
			goto End;
		}
	}

	$ret = 0;
	End:
		fclose($fh);
		return $ret;
}

function DebugFile($filename)
{
	if (false === ($str = file_get_contents($filename))) {
		Debug("!! error read file: $filename");
	}
	
	Debug("===== $filename =====");
	Debug($str);
	Debug("==========");	
}

function IsValidDate($date, $beg, $end)
{
	$ret = true;
	if (0 != $beg) {
		$ret = $beg <= $date;
	}

	if (0 != $end) {
		$ret = $date < $end;
	}

	return $ret;
}

function MigrateKeyinfo()
{
	if (!file_exists(CODESIGN_DIR . '/' . KEYINFO_USER)) {
		goto End;
	}

	$keyinfo = file_get_contents(CODESIGN_DIR . '/' . KEYINFO_SYS);
	$keyinfo_user = file_get_contents(CODESIGN_DIR . '/' . KEYINFO_USER);
	if (false === $keyinfo || false === $keyinfo_user) {
		ErrorLog("Migrate key file error.");
		goto End;
	}

	$keyinfo_user = json_decode($keyinfo_user, true);
	foreach($keyinfo_user as $key) {
		if (strstr($keyinfo, $key['fingerprint'])) {
			DeleteUserKey($key['fingerprint'], true);
		}
	}

	End:
		return;
}

function CheckKeyArchive($keyarch)
{
	$ret = 1;
	RmWorkDir();
	
	echo "-- work dir = " . WORK_DIR;
	
	exec("mkdir -p " . escapeshellarg(WORK_DIR));
	chdir(WORK_DIR);
	$cmd = "tar xf " . escapeshellarg($keyarch) . " -C " . escapeshellarg(WORK_DIR);
	exec($cmd, $cmd_out, $cmd_ret);
	if (0 != $cmd_ret) {
		ErrorLog("Failed to extract key archive.");
		goto End;
	}

	chdir(WORK_DIR);
	$version = file_get_contents(VERSION);
	if (!ctype_digit($version)) {
		ErrorLog("VERSION file contains bad data.");
		goto End;
	}

	$local_ver = (int)file_get_contents(CODESIGN_DIR . "/" . VERSION);
	if (false !== $local_ver && $local_ver >= $version) {
		ErrorLog("Key archive ver=$version is not greater than local ver=$local_ver.");
		$ret = 2;
		goto End;
	}

	$cmd = GPGCMD . " " . KEYRING . " >/dev/null 2>&1";
	exec($cmd, $cmd_out, $cmd_ret);
	if (0 !== $cmd_ret) {
		ErrorLog("keyring file contains bad data.");
		goto End;
	}

	$fh = fopen(KEYINFO_SYS, 'r');
	while ($line = fgets($fh)) {
		$line = trim($line);
		$pieces = explode(':', $line);
		if (9 !== count($pieces)) {
			ErrorLog("keyinfo-sys file must contains 9 fields.");
			goto End;
		}

		if (!ctype_xdigit($pieces[0])) {
			ErrorLog("keyinfo-sys field 0 must be hex.");
			goto End;
		}

		for ($i = 1; $i <= 5; ++$i) {
			if (!ctype_digit($pieces[$i])) {
				ErrorLog("keyinfo-sys field $i must be digit.");
				goto End;
			}
		}
	}

	$ret = 0;
	End:
		if (null !== $fh) {
			fclose($fh);
		}

		RmWorkDir();
		return $ret;
}

function OnlineUpdateSynoKey($force_update = false)
{
	echo "OnlineUpdateSynoKey \n";
	$ret = - 1;
	if (!is_dir(CODESIGN_DIR)) {
		exec("rm -f " . CODESIGN_DIR);
		exec("mkdir -p " . CODESIGN_DIR);
	}

	chdir(CODESIGN_DIR);
	$keyserver = null;
	$cmd = "get_key_value /etc/synoinfo.conf codesign_key_server";
	echo "  $cmd \n";
	exec($cmd, $out, $cmd_ret);

	$keyserver = 1 == $cmd_ret ? $out[0] : KEYSERVER;
	$now = (int)date("U");
	if (is_file(KEYINFO_SYS) && is_file(VERSION)) {
		$modify_time = filemtime(VERSION);
		if (true !== $force_update && false !== $modify_time && MIN_UPDATE_INTERVAL_SEC > $now - $modify_time) {
			$ret = 0;
			goto End;
		}
	}

	echo "  file_get_contents( $keyserver / VERSION) \n";
	$remote_ver = file_get_contents($keyserver . "/" . VERSION);
	if (false === $remote_ver) {
		unlink(VERSION);
		ErrorLog("Failed to get VERSION");
		goto End;
	}
	echo "-ok1-";

	$local_ver = file_get_contents(VERSION);
	if (true !== $force_update && false !== $local_ver && false !== $remote_ver && $local_ver === $remote_ver) {
		touch(VERSION);
		$ret = 0;
		goto End;
	}
	echo "-ok2-";

	echo "  file_get_contents( $keyserver / KEYRING) \n";
	$keyring = file_get_contents($keyserver . "/" . KEYRING);
	if (false === $keyring) {
		ErrorLog("Failed to get keyring");
		goto End;
	}
	echo "-ok3-";

	echo "  file_get_contents( $keyserver / KEYINFO_SYS) \n";
	$keyinfo = file_get_contents($keyserver . "/" . KEYINFO_SYS);
	if (false === $keyinfo) {
		ErrorLog("Failed to get keyinfo-sys");
		goto End;
	}
	echo "-ok4-";

	file_put_contents(VERSION, $remote_ver);
	file_put_contents(KEYRING, $keyring);
	file_put_contents(KEYINFO_SYS, $keyinfo);
	MigrateAndImportKey();
	$ret = 0;
	End:
		return $ret;
}


function MakeToken($sig_file, $token_file)
{
	$sig_file = WORK_DIR . "/" . $sig_file; //!!
	
	
	Debug(" -----");
	Debug(" MakeToken 1) signature file = [ $sig_file ]");

	$ret = false;
	$ts_server = null;
	$cmd = "get_key_value /etc/synoinfo.conf codesign_timestamp_server";
	Debug(" $cmd");
	
	exec($cmd, $out, $cmd_ret);
	$ts_server = 1 == $cmd_ret ? $out[0] : TIMESERVER;
	
	Debug(" -----");
	Debug(" MakeToken 2) ts server = $ts_server");

	Debug(" -----");
	Debug(" MakeToken 3) create request to ts server");
	chdir(WORK_DIR);
	$ch = curl_init($ts_server . "/timestamp.php");
	$post = array(
		//'file' => '@' . $sig_file
		'file' => new CurlFile($sig_file)
	);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
	curl_setopt($ch, CURLOPT_POST, 1);
	curl_setopt($ch, CURLOPT_POSTFIELDS, $post);
	
	$curl_info = curl_getinfo($ch);
	Debug(" -----");
	Debug(" MakeToken 4) curl info before request: \n" . print_r($curl_info, true) );
	Debug(" -- post --");
	Debug(print_r($post, true));	


	// use fiddler in computer as logging proxy
	//!!$proxy = '192.168.1.38:8888';
	//!!curl_setopt($ch, CURLOPT_PROXY, $proxy);	
	
	//ob_start();
	//$curlerr = fopen('php://output', 'w');
	//curl_setopt($ch, CURLOPT_VERBOSE, true); //!!
	//curl_setopt($ch, CURLOPT_STDERR, $curlerr);

	$timestamp = curl_exec($ch);
	
	//fclose($curlerr);
	//$curlerrdata = ob_get_clean();	

	
	Debug(" -----");
	Debug(" MakeToken 5) timestamp = $timestamp");
	//Debug(" -----");
	//Debug(" MakeToken 5.1) error data: \n" . $curlerrdata);
	
	$curl_info = curl_getinfo($ch);
	Debug(" -----");
	Debug(" MakeToken 6) curl info after request: \n" . print_r($curl_info, true) );

	$http_status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
	Debug(" -----");
	Debug(" MakeToken 7) http status: $http_status");
	
	if (false == $timestamp) {
		ErrorLog("curl_exec() failed.");
		goto End;
	}
	elseif (200 != $http_status) {
		ErrorLog(" http return code: $http_status ");
		goto End;
	}

	Debug(" -----");
	Debug(" MakeToken 8) write token");
	if (false == file_put_contents($token_file, $timestamp)) {
		ErrorLog("write token failed.");
		goto End;
	}

	Debug(" -----");
	Debug(" MakeToken 9) curl get: $ts_server/timeserver.gpg ");
	$pubkey = file_get_contents("$ts_server/timeserver.gpg");
	if (false == $pubkey) {
		ErrorLog("Cannot read timeserver.gpg");
		goto End;
	}
	Debug(" pubkey = $pubkey");

	Debug(" -----");
	Debug(" MakeToken 10) file_put_contents : $pub_file " );
	$pub_file = tempnam(TMP_DIR, "codesign_");
	if (!file_put_contents($pub_file, $pubkey)) {
		ErrorLog("Cannot write timeserver.gpg");
		goto End;
	}

	Debug(" -----");
	Debug(" MakeToken 11) gpg import: $pub_file " );
	$cmd = GPGCMD . " --import $pub_file > /dev/null 2>&1";
	Debug(" $cmd");
	exec($cmd, $out, $cmd_ret);
	
	Debug(" MakeToken 12) gpg verify: $pub_file " );
	$cmd = GPGCMD . " --verify $token_file > /dev/null 2>&1";
	Debug(" $cmd");
	exec($cmd, $out, $cmd_ret);
	if (0 != $cmd_ret) {
		ErrorLog("Verify token failed.");
		ErrorLog(print_r($out, true));
		goto End;
	}

	Debug(" -----");
	Debug(" MakeToken 12) curl close & delete files");
	$ret = true;
	End:
		curl_close($ch);
		
		if (is_file($pub_file)) {
			unlink($pub_file);
		}

		if (is_file($sig_file)) {
			unlink($sig_file);
		}
		
		return $ret;
}


function Usage()
{
	echo "Copyright (c) 2000-" . date("Y") . " Synology Inc. All rights reserved.nn";
	echo "Syntax: php codesign.php [option] [package-file]nn";
	echo "Synopsis: This scripts is a code signing tool for packages.nn";
	echo "Options:n";
	echo "      --sign      make a signaturen";
	echo "      --verify    verify a signaturen";
	echo "      --resign    resign a signaturen";
	echo "      --update    update keyring from servern";
	echo "      --help      show this helpn";
	return 0;
}


//-- SIGN package
function Sign($pkg_path, $delsig = false)
{
	Debug("---------------------------");
	Debug("SIGN 1) check pkg_path not empty");
	$ret = - 1;
	if (null == $pkg_path) {
		Debug("Sign: Bad parameter.");
		goto End;
	}
	Debug(" ok");

	Debug("---------------------------");
	Debug("SIGN 2) check pkg_path not exists");
	chdir(CURR_DIR);
	if (!is_file($pkg_path)) {
		Debug(" Package $pkg_path not found.");
		goto End;
	}
	Debug(" ok");

	Debug("---------------------------");
	Debug("SIGN 3) find secret key");
	$pkg_name = basename($pkg_path);
	$cmd = GPGCMD . " --list-secret-keys " . DEV_KEY_FPR . " > /dev/null 2>&1";
	Debug(" $cmd");
	exec($cmd, $out, $cmd_ret);
	if (0 != $cmd_ret) {
		Debug(" Private key (PFR ". DEV_KEY_FPR ." ) not found.");
		goto End;
	}
	Debug(" ok");

	Debug("---------------------------");
	Debug("SIGN 4) recreate work dir: " . WORK_DIR);
	RmWorkDir();
	exec("mkdir -p " . escapeshellarg(WORK_DIR));
	
	Debug("---------------------------");
	Debug("SIGN 5) unpack package archive: " . $pkg_path);
	chdir(CURR_DIR);
	$cmd = "tar xf " . escapeshellarg($pkg_path) . " -C " . escapeshellarg(WORK_DIR);
	Debug(" $cmd");
	exec($cmd, $out, $cmd_ret);
	if (0 != $cmd_ret) {
		Debug("  Untar package to working directory failed.");
		goto End;
	}
	Debug(" ok");

	Debug("---------------------------");
	Debug("SIGN 5) delete signature file: " . TOKEN_FILE);
	chdir(WORK_DIR);
	if (is_file(TOKEN_FILE)) {
		if ($delsig) {
			unlink(TOKEN_FILE);
			Debug(" Deleted");
		}
		else {
			Debug(" Signature file is already exist");
			goto End;
		}
	}
	Debug(" ok");

	Debug("---------------------------");
	Debug("SIGN 6) CatAllFiles");
	if (0 != CatAllFiles()) {
		ErrorLog("CatAllFiles failed");
		Debug("CatAllFiles failed");
		goto End;
	}
	Debug(" ok");

	Debug("---------------------------");
	Debug("SIGN 7) detach signature");
	$cmd = GPGCMD . " --local-user " . DEV_KEY_FPR . " --armor --detach-sign --output " . SIG_FILE . " " . ALL_FILES;
	Debug(" $cmd");
	exec($cmd, $out, $cmd_ret);
	if (0 != $cmd_ret) {
		Debug(" Make detach signature failed.");
		goto End;
	}
	DebugFile(SIG_FILE);
	Debug(" ok");

	Debug("---------------------------");
	Debug("SIGN 8) MakeToken | " . SIG_FILE . " | " . TOKEN_FILE);
	if (!MakeToken(SIG_FILE, TOKEN_FILE)) {
		Debug(" Make token failed.");
		goto End;
	}
	Debug(" ok");

	Debug("---------------------------");
	Debug("SIGN 9) Create archive: " . $pkg_name);
	unlink(ALL_FILES);
	$cmd = "tar -cf " . escapeshellarg($pkg_name) . " *";
	Debug(" $cmd");
	exec($cmd, $out, $cmd_ret);
	if (0 != $cmd_ret) {
		Debug(" Failed to create signed spk file.");
		goto End;
	}
	Debug(" ok");

	Debug("---------------------------");
	Debug("SIGN 10) Create archive: " . $pkg_name);
	chdir(CURR_DIR);
	Debug(" mv " . WORK_DIR . "/$pkg_name ". CURR_DIR ."/signed_".$pkg_path );
	exec("mv " . WORK_DIR . "/$pkg_name ". CURR_DIR ."/signed_".$pkg_path."", $out, $cmd_ret);
	if (0 != $cmd_ret) {
		Debug(" Failed to mv signed package to $pkg_path .");
		goto End;
	}
	Debug(" ok");

	$ret = 0;

	End:
	//!!Debug("---------------------------");
	//!!Debug("SIGN 11) RmWorkDir ");
	//!!RmWorkDir();

	return $ret;
}


function Verify($pkg_path)
{
	$ret_syno = 0;
	$ret_3rd = 1;
	$ret_useradd = $ret_3rd;
	$ret_unknown_dev = 2;
	$ret_nosig = 3;
	$ret_expire = 4;
	$ret_badsig = 5;
	$ret_error = 6;
	$ret = $ret_error;
	if (null == $pkg_path) {
		ErrorLog("Verify: Bad parameter.");
		goto End;
	}

	chdir(CURR_DIR);
	if (!is_file($pkg_path)) {
		ErrorLog("Package $pkg_path not found.");
		goto End;
	}

	$pkg_name = basename($pkg_path);
	$cmd = "tar tf " . escapeshellarg($pkg_path) . " " . TOKEN_FILE . " > /dev/null 2>&1";
	exec($cmd, $out, $cmd_ret);
	if (0 != $cmd_ret) {
		ErrorLog("Signature file not found in archive.");
		$ret = $ret_nosig;
		goto End;
	}

	if (0 != OnlineUpdateSynoKey()) {
		ErrorLog("In Verify: OnlineUpdateSynoKey failed");
	}

	chdir(CODESIGN_DIR);
	if (!is_file(KEYRING)) {
		ErrorLog("Keyring is missing.");
		goto End;
	}

	if (!is_file(KEYINFO_SYS)) {
		ErrorLog("Keyinfo is missing.");
		goto End;
	}

	RmWorkDir();
	exec("mkdir -p " . escapeshellarg(WORK_DIR));
	chdir(WORK_DIR);
	chdir(CURR_DIR);
	$cmd = "tar xf " . escapeshellarg($pkg_path) . " -C " . escapeshellarg(WORK_DIR) . " > /dev/null 2>&1";
	exec($cmd, $out, $cmd_ret);
	if (0 != $cmd_ret) {
		ErrorLog("Untar package to working directory failed.");
		goto End;
	}

	unlink(WORK_DIR . "/" . TOKEN_FILE);
	if (0 != CatAllFiles()) {
		ErrorLog("CatAllFiles failed");
		goto End;
	}

	chdir(CURR_DIR);
	$cmd = "tar xf " . escapeshellarg($pkg_path) . " -C " . escapeshellarg(WORK_DIR) . " " . TOKEN_FILE . " > /dev/null 2>&1";
	exec($cmd, $out, $cmd_ret);
	if (0 != $cmd_ret) {
		ErrorLog("Untar token file failed.");
		goto End;
	}

	$ret = $ret_unknown_dev;
	chdir(WORK_DIR);
	$cmd = GPGCMD . " --status-file " . TOKEN_STATUS_FILE . " " . TOKEN_FILE . " > /dev/null 2>&1";
	exec($cmd, $out, $cmd_ret);
	if (0 != $cmd_ret) {
		ErrorLog("Verify token failed");
		goto End;
	}

	$out = null;
	$cmd = "grep VALIDSIG " . TOKEN_STATUS_FILE . " | awk '{print $NF}'";
	exec($cmd, $out, $cmd_ret);
	if (0 != $cmd_ret) {
		ErrorLog("Verify token failed.");
		goto End;
	}

	$token_sig_fpr = $out[0];
	$cmd = "grep $token_sig_fpr " . CODESIGN_DIR . "/" . KEYINFO_SYS;
	exec($cmd, $token_sig_info, $cmd_ret);
	if (0 != $cmd_ret) {
		ErrorLog("$token_sig_fpr: token sig not found in the keyinfo.");
		goto End;
	}

	list($skip, $token_sig_beg, $token_sig_end, $token_sig_type) = explode(":", $token_sig_info[0]);
	if (!IsKeyType($token_sig_type, KEY_TYPE_TIMESTAMP)) {
		ErrorLog("Token signer is not Synology");
		goto End;
	}

	$out = null;
	$cmd = "grep VALIDSIG " . TOKEN_STATUS_FILE . " | awk '{print $5}'";
	exec($cmd, $out, $cmd_ret);
	$sign_time = $out[0];
	if (!IsValidDate($sign_time, $token_sig_beg, $token_sig_end)) {
		ErrorLog("The token signature date is invalid.");
		goto End;
	}

	chdir(WORK_DIR);
	$cmd = GPGCMD . " --status-file " . SIG_STATUS_FILE . " --verify " . SIG_FILE . " " . ALL_FILES . " > /dev/null 2>&1";
	exec($cmd, $out, $cmd_ret);
	if (0 != $cmd_ret) {
		if (1 == $cmd_ret) {
			ErrorLog("This package is broken.");
			$ret = $ret_badsig;
		}
		else {
			ErrorLog("This package is signed by unknown developer.");
			$ret = $ret_unknown_dev;
		}

		goto End;
	}

	$out = null;
	$cmd = "grep VALIDSIG " . SIG_STATUS_FILE . " | awk '{print $NF}'";
	exec($cmd, $out, $cmd_ret);
	$signer_fpr = $out[0];
	chdir(CODESIGN_DIR);
	if (is_file(KEYINFO_USER)) {
		$keyinfo = null;
		$cmd = "grep $signer_fpr " . KEYINFO_USER;
		exec($cmd, $keyinfo, $cmd_ret);
		if (0 == $cmd_ret) {
			$ret = $ret_useradd;
			goto End;
		}
	}

	$keyinfo = null;
	$cmd = "grep $signer_fpr " . KEYINFO_SYS;
	exec($cmd, $keyinfo, $cmd_ret);
	if (0 != $cmd_ret) {
		ErrorLog("$signer_fpr: signer fpr not found in keyinfo.");
		$ret = $ret_unknown_dev;
		goto End;
	}

	list($fpr, $valid_beg, $valid_end, $sig_type) = explode(":", $keyinfo[0]);
	if (!IsValidDate($sign_time, $valid_beg, $valid_end)) {
		ErrorLog("The signature date is invalid.");
		$ret = $ret_expire;
		goto End;
	}

	if (IsKeyType($sig_type, KEY_TYPE_DEVELOP) || IsKeyType($sig_type, KEY_TYPE_OFFICIAL)) {
		$ret = $ret_syno;
	}
	elseif (IsKeyType($sig_type, KEY_TYPE_3RDPARTY)) {
		$ret = $ret_3rd;
	}

	End:
		RmWorkDir();
		return $ret;
}

function IsKeyType($real_type, $except_type)
{
	return $real_type == $except_type;
}

function IsUserGPGKey($key)
{
	$ret = false;
	$cmd = GPGCMD . " --with-colons --fixed-list-mode --with-fingerprint " . escapeshellarg($key);
	exec($cmd, $cmd_out, $cmd_ret);
	if (0 !== $cmd_ret) {
		goto End;
	}

	$ret = true;
	End:
		return $ret;
}

function IsSynoKey($key)
{
	$ret = false;
	exec("tar tf " . escapeshellarg($key) , $filelist, $cmd_ret);
	if (0 !== $cmd_ret || 3 !== count($filelist)) {
		ErrorLog("Key archive data is bad. ret=$cmd_ret, cnt=" . count($filelist));
		goto End;
	}

	$ret = true;
	End:
		return $ret;
}

function ImportKey($key)
{
	$ret_badcert = 4;
	$ret = $ret_badcert;
	if (IsUserGPGKey($key)) {
		if (0 !== ($ret = ImportUserKey($key))) {
			goto End;
		}
	}
	elseif (IsSynoKey($key)) {
		if (0 !== ($ret = ManualUpdateSynoKey($key))) {
			goto End;
		}
	}
	else {
		ErrorLog("This file is not gpg-key and not syno-key.");
		goto End;
	}

	$ret = 0;
	End:
		return $ret;
}

function ManualUpdateSynoKey($keyarch)
{
	$ret_ok = 0;
	$ret_badcert = 4;
	$ret_unknown = 5;
	$ret = $ret_unknown;
	if (0 != ($status = CheckKeyArchive($keyarch))) {
		if (2 === $status) {
			$ret = $ret_ok;
		}
		else {
			$ret = $ret_badcert;
		}

		goto End;
	}

	$cmd = "tar xf " . escapeshellarg($keyarch) . " -C " . CODESIGN_DIR;
	exec($cmd, $cmd_out, $cmd_ret);
	if (0 !== $cmd_ret) {
		ErrorLog("Failed to extract key archive to codesgin dir.");
		goto End;
	}

	MigrateAndImportKey();
	$ret = $ret_ok;
	End:
		return $ret;
}

function ImportUserKey($key)
{
	$ret_ok = 0;
	$ret_conflict_usr = 1;
	$ret_conflict_sys = 2;
	$ret_revoke = 3;
	$ret_badcert = 4;
	$ret_unknown = 5;
	$ret = $ret_unknown;
	if (null == $key) {
		ErrorLog("ImportUserKey: Bad parameter.");
		goto End;
	}

	if (0 != OnlineUpdateSynoKey()) {
		ErrorLog("In ImportUserKey: OnlineUpdateSynoKey failed");
	}

	$cmd = GPGCMD . " --with-colons --fixed-list-mode --with-fingerprint " . escapeshellarg($key);
	exec($cmd, $keyinfo, $cmd_ret);
	if (0 != $cmd_ret) {
		ErrorLog("Certificate is bad.");
		$ret = $ret_badcert;
		goto End;
	}

	$result = ParseKeyring($keyinfo, $keyinfo_result);
	if (0 != $result) {
		if (1 == $result) {
			$ret = $ret_revoke;
		}
		else {
			$ret = $ret_badcert;
		}

		ErrorLog("ImportUserKey: ParseKeyring failed. error: $result");
		goto End;
	}

	$cmd = GPGCMD . " --import " . escapeshellarg($key) . " > /dev/null 2>&1";
	exec($cmd, $out, $cmd_ret);
	if (0 != $cmd_ret) {
		ErrorLog("$key: import failed.");
		$ret = $ret_badcert;
		goto End;
	}

	$result = AddKeyinfoUser($keyinfo_result);
	if (0 != $result) {
		if (1 == $result) {
			$ret = $ret_conflict_usr;
		}
		elseif (2 == $result) {
			$ret = $ret_conflict_sys;
		}

		ErrorLog("AddKeyinfoUser failed. error: $result");
		goto End;
	}

	$ret = $ret_ok;
	End:
		return $ret;
}

function DeleteUserKey($fingerprint, $force = false)
{
	$ret = - 1;
	if (null == $fingerprint) {
		ErrorLog("DeleteUserKey: Bad parameter.");
		goto End;
	}

	if (!file_exists(CODESIGN_DIR . "/" . KEYINFO_USER)) {
		ErrorLog("There are no user added key (keyinfo-user).");
		goto End;
	}

	$old_info = file_get_contents(CODESIGN_DIR . "/" . KEYINFO_USER);
	if (!strstr($old_info, $fingerprint)) {
		ErrorLog("There are no key $fingerprint to delete.");
		goto End;
	}

	$old_info = json_decode($old_info, true);
	$info = array();
	foreach($old_info as & $key) {
		if (0 === strcmp($key['fingerprint'], $fingerprint)) {
			if ($force || empty($key['source'])) {
				$cmd = GPGCMD . " --delete-secret-and-public-keys $fingerprint";
				exec($cmd, $out, $cmd_ret);
				if (0 != $cmd_ret) {
					ErrorLog("Failed to delete keys [$fingerprint].");
					goto End;
				}

				continue;
			}

			$key['user_added'] = false;
		}

		$info[] = $key;
	}

	file_put_contents(CODESIGN_DIR . "/" . KEYINFO_USER, json_encode($info));
	$ret = 0;
	End:
		return $ret;
}

function ParseKeyring($keyinfo, &$keyinfo_arr)
{
	$ret_ok = 0;
	$ret_revoke = 1;
	$ret = 2;
	$index = 0;
	$key_algo = array(
		'1' => 'RSA',
		'16' => 'Elgamal',
		'17' => 'DSA',
		'20' => 'Elgamal'
	);
	foreach($keyinfo as $row) {
		$info_arr = explode(":", $row);
		$info_type = $info_arr[0];
		if (0 == strncmp($info_type, "fpr", 3)) {
			$info['fingerprint'] = $info_arr[9];
		}
		elseif (0 == strncmp($info_type, "uid", 3)) {
			ParseUserAttr($info_arr[9], $info['name'], $info['email']);
		}
		elseif (0 == strncmp($info_type, "pub", 3) || 0 == strncmp($info_type, "sec", 3)) {
			if (0 == strncmp($info_arr[1], "r", 1)) {
				ErrorLog("This key has been revoked.");
				$ret = $ret_revoke;
				goto End;
			}

			$info = & $keyinfo_arr[$index++];
			$info['length'] = $info_arr[2];
			$info['algorithm'] = $key_algo[$info_arr[3]];
			ParseUserAttr($info_arr[9], $info['name'], $info['email']);
		}
	}

	$ret = $ret_ok;
	End:
		return $ret;
}

function ParseUserAttr($user_attr, &$name, &$email)
{
	if (null === $user_attr || "" === $user_attr || null !== $name) {
		return;
	}

	$p1 = strpos($user_attr, '(');
	$p2 = strpos($user_attr, '<');
	if (false !== $p1) {
		$p = $p1 - 1;
	}
	elseif (false !== $p2) {
		$p = $p2 - 1;
	}
	else {
		$p = strlen($user_attr);
	}

	$name = substr($user_attr, 0, $p);
	preg_match('/<(.*?)>/', $user_attr, $res);
	if ($res[1]) {
		$email = $res[1];
	}
}

function Resign($pkg_path)
{
	$ret = - 1;
	if (null == $pkg_path) {
		ErrorLog("Resign: Parameter Bad");
		goto End;
	}

	$ret = Verify($pkg_path);
	if (3 == $ret) {
		$ret = Sign($pkg_path, false);
	}
	elseif (0 == $ret || 1 == $ret) {
		$ret = Sign($pkg_path, true);
	}
	else {
		echo "Verify failed.n";
		goto End;
	}

	End:
		return $ret;
}

function AddOtherKeyServer($server_key, $server_url)
{
	$ret = - 1;
	if (0 != OnlineUpdateSynoKey()) {
		ErrorLog("In AddOtherKeyServer: OnlineUpdateSynoKey failed");
	}

	if (!is_file($server_key)) {
		ErrorLog("server key: $server_key not found.");
		goto End;
	}

	if (0 != DeleteOtherKeyByServer($server_url)) {
		ErrorLog("DeleteOtherKeyServer failed.");
		goto End;
	}

	$json_arr = file_get_contents($server_key);
	if (false === $json_arr) {
		ErrorLog("$server_key: file get contents failed");
		goto End;
	}

	$keys = json_decode($json_arr);
	if (false === $keys) {
		ErrorLog("json_decode: $json_arr failed");
		goto End;
	}

	if (!is_array($keys)) {
		ErrorLog("Other key servers keyring is not array");
		goto End;
	}

	foreach($keys as $key) {
		$key_file = tempnam(TMP_DIR, "codesign_");
		if (!file_put_contents($key_file, $key)) {
			ErrorLog("Cannot write key file");
			continue;
		}

		$keyinfo = null;
		$cmd = GPGCMD . " --with-colons --fixed-list-mode --with-fingerprint $key_file";
		exec($cmd, $keyinfo, $cmd_ret);
		if (0 != $cmd_ret) {
			ErrorLog(__LINE__ . " Certificate format is bad.");
			unlink($key_file);
			continue;
		}

		$keyinfo_result = null;
		$result = ParseKeyring($keyinfo, $keyinfo_result);
		if (0 != $result) {
			ErrorLog(" ParseKeyring failed. error: $result");
			unlink($key_file);
			continue;
		}

		$cmd = GPGCMD . " --import $key_file > /dev/null 2>&1";
		exec($cmd, $out, $cmd_ret);
		if (0 != $cmd_ret) {
			ErrorLog("$key: import failed.");
			unlink($key_file);
			continue;
		}

		unlink($key_file);
		AddKeyinfoUser($keyinfo_result, $server_url);
	}

	$ret = 0;
	End:
		return $ret;
}

function AddKeyinfoUser($new_info, $source = null)
{
	$ret_ok = 0;
	$ret_conflict_usr = 1;
	$ret_conflict_sys = 2;
	$ret_init = 3;
	$ret = $ret_init;
	$user_added = null === $source;
	foreach($new_info as & $key) {
		$key['user_added'] = $user_added;
		$key['source'] = true === $user_added ? array() : array(
			$source
		);
	}

	chdir(CODESIGN_DIR);
	$old_info = array();
	if (file_exists(KEYINFO_USER)) {
		$old_info = json_decode(file_get_contents(KEYINFO_USER) , true);
		if (!is_array($old_info)) {
			$old_info = array();
		}
	}

	$keyinfo_sys = file_get_contents(KEYINFO_SYS);
	if (false === $keyinfo_sys) {
		ErrorLog("Cannot read " . KEYINFO_SYS);
		goto End;
	}

	foreach($new_info as $new_key) {
		if (strstr($keyinfo_sys, $new_key['fingerprint'])) {
			$ret = $ret_conflict_sys;
			ErrorLog("This key " . $new_key['fingerprint'] . " is already in " . KEYINFO_SYS);
			continue;
		}

		$need_append = true;
		foreach($old_info as & $old_key) {
			if (0 != strcmp($old_key['fingerprint'], $new_key['fingerprint'])) {
				continue;
			}

			$need_append = false;
			if ($old_key['user_added'] && $user_added) {
				$ret = $ret_conflict_usr;
				ErrorLog("This key " . $new_key['fingerprint'] . "is already in " . KEYINFO_USER);
				break;
			}

			$old_key['user_added'] = $old_key['user_added'] || $new_key['user_added'];
			$old_key['source'] = array_unique(array_merge($old_key['source'], $new_key['source']));
			break;
		}

		if ($need_append) {
			array_push($old_info, $new_key);
		}
	}

	if (false === file_put_contents(KEYINFO_USER, json_encode($old_info))) {
		ErrorLog("Failed to write: " . KEYINFO_USER);
		goto End;
	}

	if ($ret === $ret_init) {
		$ret = $ret_ok;
	}

	End:
		return $ret;
}

function DeleteOtherKeyByServer($server_url)
{
	$ret = - 1;
	chdir(CODESIGN_DIR);
	if (!file_exists(KEYINFO_USER)) {
		$ret = 0;
		goto End;
	}

	$file = file_get_contents(KEYINFO_USER);
	if (false === $file) {
		ErrorLog("Failed to get " . KEYINFO_USER);
		goto End;
	}

	$info = json_decode($file, true);
	if (false === $info) {
		ErrorLog("Failed to json decode " . KEYINFO_USER);
		goto End;
	}

	if (!is_array($info)) {
		ErrorLog(KEYINFO_USER . " format error");
		unlink(KEYINFO_USER);
		goto End;
	}

	foreach($info as $i => & $key) {
		$source = & $key['source'];
		$k = array_search($server_url, $source);
		if (false === $k) {
			continue;
		}

		unset($source[$k]);
		$source = array_values($source);
		if ($key['user_added'] || !empty($source)) {
			continue;
		}

		$fingerprint = $key['fingerprint'];
		$cmd = GPGCMD . " --delete-secret-and-public-keys $fingerprint";
		exec($cmd, $out, $cmd_ret);
		if (0 != $cmd_ret) {
			ErrorLog("Failed to delete keys [$fingerprint].");
			goto End;
		}

		unset($info[$i]);
	}

	$info = array_values($info);
	if (false === file_put_contents(KEYINFO_USER, json_encode($info))) {
		ErrorLog("Failed to write " . KEYINFO_USER);
		goto End;
	}

	$ret = 0;
	End:
		return $ret;
}

function ListKey()
{
	$ret = - 1;
	$fh = null;
	$key_arr = array();
	$key_algo = array(
		'1' => 'RSA',
		'16' => 'Elgamal',
		'17' => 'DSA',
		'20' => 'Elgamal'
	);
	chdir(CODESIGN_DIR);
	if (is_file(KEYINFO_USER)) {
		$keyinfo_user = file_get_contents(KEYINFO_USER);
		$key_arr = json_decode($keyinfo_user, true);
	}

	if (!is_file(KEYINFO_SYS)) {
		ErrorLog("There are no keyinfo-sys");
		goto End;
	}

	if (!($fh = fopen(KEYINFO_SYS, "r"))) {
		ErrorLog("Failed to open keyinfo-sys");
		goto End;
	}

	while (false !== ($line = fgets($fh))) {
		$line = trim($line);
		$chunk = explode(":", $line);
		$signer_type = $chunk[3];
		if (IsKeyType($signer_type, KEY_TYPE_TIMESTAMP) || IsKeyType($signer_type, KEY_TYPE_DEVELOP)) {
			continue;
		}

		$key['length'] = $chunk[5];
		$key['algorithm'] = $key_algo[$chunk[4]];
		$key['name'] = $chunk[6];
		$key['fingerprint'] = $chunk[0];
		array_push($key_arr, $key);
	}

	if (!feof($fh)) {
		ErrorLog("Unexpected fgets() fail in ListKey()");
		goto End;
	}

	echo json_encode($key_arr);
	$ret = 0;
	End:
		if ($fh) {
			fclose($fh);
		}

		return $ret;
}

function MigrateAndImportKey()
{
	MigrateKeyinfo();
	exec(GPGCMD . " --import " . CODESIGN_DIR . '/' . KEYRING . " > /dev/null 2>&1");
}

function InstallDefaultSynoKey()
{
	$ret = 1;
	
	$key = CODESIGN_DIR . '/synokey.tgz';
	if (!is_file($key)) {
		$ret = 0;
		goto End;
	}

	$cmd = "tar xf $key -C " . CODESIGN_DIR;
	exec($cmd, $cmd_out, $cmd_ret);
	if (0 !== $cmd_ret) {
		ErrorLog("Failed to untar synokey.tgz");
		goto End;
	}

	OnlineUpdateSynoKey(true);
	$ret = 0;
	unlink($key);
	End:
		system("rm -rf $work_dir");
		return $ret;
}




if (0 !== InstallDefaultSynoKey()) {
	ErrorLog("Failed to install default syno key.");
}

$status = - 1;
switch ($argv[1]) {
	case "--sign":
	case "-s":
		echo "OPERATION: SIGN";
		$status = Sign($argv[2], true);
		break;

	case "--verify":
	case "-v":
		$status = Verify($argv[2]);
		break;

	case "--listkey":
	case "-l":
		$status = ListKey();
		break;

	case "--import":
	case "-i":
		$status = ImportKey($argv[2]);
		break;

	case "--delete":
	case "-d":
		$status = DeleteUserKey($argv[2]);
		break;

	case "--resign":
	case "-r":
		$status = Resign($argv[2]);
		break;

	case "--update":
	case "-u":
		$status = OnlineUpdateSynoKey();
		break;

	case "--force-update":
		$status = OnlineUpdateSynoKey(true);
		break;

	case "--addserver":
		$status = AddOtherKeyServer($argv[2], $argv[3]);
		break;

	case "--delserver":
		$status = DeleteOtherKeyByServer($argv[2]);
		break;

	case "--help":
	case "-h":
	default:
		$status = Usage();
		break;
}

exit($status);