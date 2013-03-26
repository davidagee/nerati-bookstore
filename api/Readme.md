Bookstore
=========

A dummy app providing a REST API for managing a list of books.

To run, you must have python 2.x installed (though py3k might work). Starting a server is pretty simple:

    $ python bookstore.py
    ...
    Bottle v0.12-dev server starting up (using WSGIRefServer())...
    Listening on http://localhost:8080/
    Hit Ctrl-C to quit.

All requests and responses must use the "application/json" Content-Type.  You can set this header appropriately if you explore the API with curl, or if you use a Chrome extension like "Dev HTTP Client."

Like any other REST API, consumers start at a known root.  In our case, it is "/", and the full path is "http://localhost:8080/".  Here is the payload for a not-logged-in user:

    { 
      "_links": [
        { 
          "href": "/login", 
          "method": "POST", 
          "rel": "login", 
          "consumes": "credentials"
        }
      ]
    }

The API should tell you the possible ways to proceed.  In this case, we want to login, so we want to follow the action with the "login" relation ("rel").  We POST a "credentials" object like

    { "username": "foo", "password": "bar" }

using something like curl

    curl -i -X POST -H "Content-Type: application/json" -d '{ "username": "foo", "password": "bar" }' localhost:8080/login
    
to "/login" and get the following response:

    < HTTP/1.0 303 See Other
    < Server: WSGIServer/0.1 Python/2.7.2
    < Content-Type: application/json
    < Content-Length: 0
    < X-Bookstore-Token: igfd
    < Location: /
    
Note the 'X-Bootstore-Token' field.  You will have to parrot this header on every subsequent request.  With our token in tow, the root presents us with a different option:

  {
    "_links": [
      {
        "href":"/books",
        "method":"GET",
        "rel":"books",
        "produces":"collection"
      }
    ]
  }
  
Hopefully from this point it is clear how to fetch the books collection and continue manipulating the API.  As an example, here's how you would create a book with curl:
  
    curl -i -X POST -H "Content-Type: application/json" -H "X-Bookstore-Token: igfd" -d '{ "author": "Me", "title": "Genius Work" }' localhost:8080/books

There are two books in the initial collection, and they are editable and deletable.  (As a bonus, you can add any field you want to a book -- there is very little schema validation there.)  Please note that all your changes to the data model will be lost when the server stops! 
