#!/usr/bin/python

import xml.etree.ElementTree as ET
from copy import copy
import logger as logger


#-- convert xml to object dict
def dictify(r, root=True):
    #logger.debug(r.tag)
    if root:
        return {r.tag : dictify(r, False)}

    d={}
    if r.attrib:
        d["_attrs"]=copy(r.attrib)
        #logger.debug(d)

    if r.text:
        d["_text"]=r.text
    for x in r.findall("./*"):
        #logger.debug(x.tag)
        if x.tag not in d:
            #logger.debug("   append x.tag to d")
            d[x.tag]=[]
        d[x.tag].append(dictify(x,False))
    return d

def deserialize(xmlstr):
    xmlroot = ET.fromstring(xmlstr)
    return dictify(xmlroot)

def indent(elem, level=0):
  i = "\n" + level*"  "
  if len(elem):
    if not elem.text or not elem.text.strip():
      elem.text = i + "  "
    if not elem.tail or not elem.tail.strip():
      elem.tail = i
    for elem in elem:
      indent(elem, level+1)
    if not elem.tail or not elem.tail.strip():
      elem.tail = i
  else:
    if level and (not elem.tail or not elem.tail.strip()):
      elem.tail = i
