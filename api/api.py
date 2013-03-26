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

def makeLink(rel, href, method, consumes=None, produces=None):
  link = {"rel": rel, "href": href, "method": method}
  if consumes is not None:
    link["consumes"] = consumes
  if produces is not None:
    link["produces"] = produces
  return link

def makeBook(**kwargs):
  global idSource
  bookId = idSource
  idSource += 1
  kwargs["_model"] = "book"
  kwargs["id"] = bookId
  kwargs["_modified"] = jsonNow()
  return bookId, kwargs

def addBookLinks(bookId, book):
  book = copy.deepcopy(book)
  links = []
  links.append(makeLink("self", "/books/"+str(bookId), "GET", produces="book"))
  links.append(makeLink("update", "/books/"+str(bookId), "PUT", consumes="book", produces="book"))
  links.append(makeLink("delete", "/books/"+str(bookId), "DELETE"))
  book["_links"] = links
  return book

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

def getToken(request):
  if 'X-Bookstore-Token' in request.headers:
    return request.headers['X-Bookstore-Token']
  else:
    return None

def requireAuth(f):

  def g(*args, **kwargs):
    token = getToken(request)
    if token in tokens:
      return f(*args, **kwargs)
    elif request.method == 'OPTIONS':
      return f(*args, **kwargs)
    else:
      return sendError(401, "Unauthorized: Need X-Bookstore-Token header.")
  return g

def handlePreflight(f):
  def g(*args, **kwargs):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'PUT, GET, POST, DELETE, OPTIONS, UPDATE'
    response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token, X-Bookstore-Token'
    response.headers['Access-Control-Expose-Headers'] = 'X-Bookstore-Token'
    response.headers['Access-Control-Max-Age'] = 3600
    return f(*args, **kwargs)
  return g

@get('/')
def getRoot():
  token = getToken(request)
  if token in tokens:
    return {"_links": [makeLink("books", "/books", "GET", produces="collection")]}
  else:
    return {"_links": [makeLink("login", "/login", "POST", consumes="credentials")]}

@route('/login', ['OPTIONS', 'POST'])
@handlePreflight
def login():
  if request.method == 'POST':
    print request.method
    if type(request.json) == dict and \
         request.json['username'] == "foo" and \
         request.json['password'] == "bar":
      token = "".join(random.choice(string.ascii_lowercase) for i in xrange(4))
      tokens.add(token)
      response.headers['X-Bookstore-Token'] = token
      response.status = 200
      response.content_type = "application/json"
      return {}
      print "ADDED TOKEN: "+token
    else:
      return sendError(401, "Unauthorized: POST with username and password.")

def makeColl(bookKeys, href):
  items = [makeLink("item", "/books/"+str(i), "GET", produces="book") for i in bookKeys]
  coll = {"_model": "collection", "items": items}
  links = []
  links.append(makeLink("self", href, "GET", produces="collection"))
  for otherRel, otherHref in [('unsorted', '/books'), ('newest', '/books?newest'), ('oldest', '/books?oldest')]:
    if href != otherHref:
      links.append(makeLink(otherRel, otherHref, "GET", produces="collection"))
  coll["_links"] = links
  return coll

@route('/books', ['OPTIONS', 'GET', 'POST'])
@handlePreflight
@requireAuth
def doBooks():
  #list
  if request.method == 'GET': 
    sortBooks = lambda books: [x for (x, y) in sorted(books.iteritems(), key=lambda (k, v): v["_modified"])]
    if 'newest' in request.GET:
      return makeColl(reversed(sortBooks(books)), '/books?newest')
    elif 'oldest' in request.GET:
      return makeColl(sortBooks(books), '/books?oldest')
    else:
      return makeColl(books.keys(), '/books')
  #create
  elif request.method == 'POST':
    i, b = makeBook(**request.json)
    books[i] = b
    logBooks()
    return addBookLinks(i, b)

@route('/books/<bookId:int>', ['OPTIONS', 'GET'])
@handlePreflight
@requireAuth
def getBook(bookId):
  if (bookId in books):
    return addBookLinks(bookId, books[bookId])
  else:
    return sendError(404, "Book not found: "+str(bookId))

@delete('/books/<bookId:int>')
@handlePreflight
@requireAuth
def deleteBook(bookId):
  if (bookId not in books):
    return sendError(404, "Book not found: "+str(bookId))
  del books[bookId]
  logBooks()
  return {"deletedBookId" : bookId }

@put('/books/<bookId:int>')
@handlePreflight
@requireAuth
def updateBook(bookId):
  if (bookId not in books):
    return sendError(404, "Book not found: "+str(bookId))
  if (request.content_type != "application/json"):
    return sendError(406, "Need json content type")
  book = books[bookId]
  for key in request.json.keys():
    if key.startswith("_"):
      continue
    else:
      book[key] = request.json.get(key)
  book["_modified"] = jsonNow()
  logBooks()
  return addBookLinks(bookId, book)

def logBooks():
  print "Books: ", books

def initBooks():
  books_data=open('books.json')
  books_json = json.load(books_data)
  for book in books_json.get('items'):
    b_author = "Unknown"
    b_title = book.get('volumeInfo').get('title')
    if book.get('volumeInfo').get('authors') is not None:
      b_author = book.get('volumeInfo').get('authors')[0]
    temp = makeBook(title=b_title, author=b_author)
    books[temp[0]] = temp[1]
  books_data.close()
  logBooks()

@get('/static')
def getStaticFileRoot():
    return getStaticFile('index.html')
 
@get('/static/<filepath:path>')
def getStaticFile(filepath):
    return static_file(filepath, root='static')

def main():
  initBooks()
  run(host='localhost', port=8080, debug=True)

if __name__ == "__main__":
  main()
