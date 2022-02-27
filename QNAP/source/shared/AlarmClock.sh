#!/bin/sh

QPKG_CONF=/etc/config/qpkg.conf
QPKG_NAME="AlarmClock"
QPKG_PATH=`/sbin/getcfg -f $QPKG_CONF $QPKG_NAME Install_path`

Build_Symlink()
{
	# build symlink
	# for web AlarmClock
	[ -L /mnt/ext/opt/apps/AlarmClock ] && rm /mnt/ext/opt/apps/AlarmClock
	ln -sf $QPKG_PATH/web /mnt/ext/opt/apps/AlarmClock

	return 0
}

Remove_Symlink()
{
	# rebuild symlink
	# for web AlarmClock 
	[ -L /mnt/ext/opt/apps/AlarmClock ] && rm /mnt/ext/opt/apps/AlarmClock
	return 0
}


case "$1" in
  start)
    ENABLED=$(/sbin/getcfg $QPKG_NAME Enable -u -d FALSE -f $QPKG_CONF)
    if [ "$ENABLED" != "TRUE" ]; then
        echo "$QPKG_NAME is disabled."
        exit 1
    fi

    : ADD START ACTIONS HERE	
    Build_Symlink

    /usr/local/bin/python $QPKG_PATH/web/cgi/server.py start >> /tmp/alarmclock.start 2>> /tmp/alarmclock.start
    ;;

  stop)
    : ADD STOP ACTIONS HERE

    /usr/local/bin/python $QPKG_PATH/web/cgi/server.py stop >> /tmp/alarmclock.stop 2>> /tmp/alarmclock.stop

    Remove_Symlink
    ;;

  restart)
    $0 stop
    $0 start
    ;;

  *)
    echo "Usage: $0 {start|stop|restart}"
    exit 1
esac

exit 0
