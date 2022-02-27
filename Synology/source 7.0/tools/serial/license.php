<?php

add_action ('woocommerce_order_details_after_order_table', 'license_for_order');

function license_for_order( $order ) {
	print "<div class=\"licenseinfo\"><h3>Your package license</h3>";

	$serial = "";
	$options = get_option( 'wccs_settings' );  
    if ( count( $options['buttons'] ) > 0 ) {
		foreach ( $options['buttons'] as $btn ) {
			if ($btn['cow'] == "myfield1")
				$serial = get_post_meta( $order->id , ''.$btn['cow'].'', true);
		};
    };
	
	$orderStatus = $order->get_status();
	if ($orderStatus != "completed") {
		print "<span style='color:red'>License is not available due to order status: <b>\"$orderStatus\"</b></span>";
	} else {
		$res = check_serial($serial);
		
		if ($res != "") {
			print "<span style='color:red'><b>Wrong NAS serial code:</b> $res<br>Please contact <a href='mailto:support@nasalarmclock.com'>support@nasalarmclock.com</a></span>";
		} else {
			$orderDate = strtotime($order->order_date);
			$license = calc_licanse($serial, $orderDate, $order->order_number, false);
			print "NAS serial code: $serial<br><br>License: <b>$license</b>";
		}
	}

	print "</div><br>";
}

// check if serial is correct
function check_serial($serial) {
	//should be 32-char hexadecimal string
	if (strlen($serial) != 32)
		return "should be 32-symbol hexadecimal string.";
	if (! ctype_xdigit($serial))
		return "should be a hexadecimal string.";
	return "";
}


// calc license by serial
// date = 
//   for commercial license, is date when license was generated 
//   for trial license, is license expiration date
// num = any number for random pos shift
function calc_licanse($dsidmd5, $date, $num, $trial) {
	// license format:
	// 1 - version of code. now 1
	// 2 - position (see below)
	
	// for older orders ver is 1
	if ($date < strtotime('2015-11-04'))
		$ver = 1;
	else
		$ver = 2;
	$pos = $num % 9;

	# encode
	$curYear = date("Y", $date);
	$curMonth = date("m", $date);
	$curDay = date("d", $date);

	$eh = "$curYear" . "$curMonth" . "$curDay" . "00" . "9384738521" . "9038465387" . "$curDay" . "$curMonth";

	$eh_ba = array();
	for ($i = 0; $i < 34; $i++)
		$eh_ba[$i] = hexdec($eh[$i]);

	$sh = strtolower($dsidmd5) . '00';

	$sh_ba = array();
	for ($i = 0; $i < 34; $i++)
		$sh_ba[$i] = hexdec($sh[$i]);

	// for more secure XOR nas serial with pseudo-random string
	if ($ver > 1) {
		$addsec = array(1,3,8,0,2,9,3,6,2,4,
						5,8,7,4,6,2,7,5,6,1,
						3,5,2,9,7,3,6,4,2,9,
						7,1,8,5);
		for ($i = 0; $i < 34; $i++) 
			$sh_ba[$i] = $sh_ba[$i] ^ $addsec[$i];
	}
	
	$sh_ba[32] = $sh_ba[$pos + 12];
	$sh_ba[33] = $sh_ba[$pos + 13];
	if ($ver > 1) {
		if ($trial) {
			$eh_ba[$pos + 12] = 5;
			$eh_ba[$pos + 13] = 4;
		} else {
			$eh_ba[$pos + 12] = 4;
			$eh_ba[$pos + 13] = 5;
		}
	} else {
		$sh_ba[$pos + 12] = 4;
		$sh_ba[$pos + 13] = 5;
		$eh_ba[$pos + 12] = 0;
		$eh_ba[$pos + 13] = 0;
	}
	
	$license = "$ver" . "$pos";
		
	for ($i = 0; $i < 34; $i++) {
		$rh_ba_i = $sh_ba[$i] ^ $eh_ba[$i];
		$license = $license . dechex($rh_ba_i);
	}

	return $license;
}

?>