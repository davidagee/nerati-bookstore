#!/usr/bin/env python

import json
from datetime import datetime
import random
import string
import copy
from bottle import *

books = {}
tokens = set(["hack"])
idSource = 0

def jsonNow():
  return datetime.now().isoformat()

@error(404)
def my404(e):
  return sendError(404, "Not found") 
@error(405)
def my405(e):
  return sendError(405, "Method not allowed") 

def sendError(code, message):
  response.content_type = 'application/json'
  response.status = code 
  return json.dumps({ "_model": "error", 'code': code, 'message': message})

@get('/')
def getStaticFileRoot():
    return getStaticFile('index.html')
 
@get('/<filepath:path>')
def getStaticFile(filepath):
    return static_file(filepath, root='.')

def main():
  run(host='localhost', port=8081, debug=True)

if __name__ == "__main__":
  main()
