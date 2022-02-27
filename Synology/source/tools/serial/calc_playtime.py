#!/usr/bin/python

offs = 1 # run from gui
offs2 = 20 #license commerc
t = 2 # should 120
t2 = t * (0x3C*offs or (0x01 ^ offs)*(offs2*3)) + ((offs2 or offs) and [0] or [0xA])[0]
print t2

offs = 1 #run from gui
offs2 = 0 #no lic
t = 2 # should 120
t2 = t * (0x3C*offs or (0x01 ^ offs)*(offs2*3)) + ((offs2 or offs) and [0] or [0xA])[0]
print t2


offs = 0 # run by timer
offs2 = 20 #license commerc
t = 2 # should 120
t2 = t * (0x3C*offs or (0x01 ^ offs)*(offs2*3)) + ((offs2 or offs) and [0] or [0xA])[0]
print t2

offs = 0 # run by timer
offs2 = 0 #no license
t = 2 # should 10
t2 = t * (0x3C*offs or (0x01 ^ offs)*(offs2*3)) + ((offs2 or offs) and [0] or [0xA])[0]
print t2
