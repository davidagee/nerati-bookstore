;(function() {

  var Nerati = {
    name : 'Nerati',
    version : '0.0.1'
  };
  Nerati.App = {
    name : 'neratibookstoreapp',
    version : '0.0.1',
    authToken : null,
    loginScreen: 'visible',
    apiHost: 'http://localhost:8080',
    currentSort: '?newest',
    routes : {"login" : "/login",
              "books" : "/books"},

    settings : {
        init : false,
        $loginForm : $('#login'),
        $loginButton : $('#loginButton'),
        $createTrigger : $('#addButton'),
        $updateButton : $('#updateButton'),
        $cancelButton : $('.cancelButton'),
        $deleteButton : $('#deleteButton'),
        $resetButton : $('.resetButton'),
        $listContainer : $('#books-list'),
        $listRepeater : $('#books-list-contents'),
        $detailContainer : $('#book-detail'),
        $createContainer : $('#book-create'),
        $createButton : $('#createButton'),
        $createForm : $('#book-create-form'),
        $editForm : $('#book-detail-form'),
        $sortByNewestButton: $('#sortNewestLink'),
        $sortByOldestButton: $('#sortOldestLink')
    },

// Initializer
    init : function () {
      var self = this;
      
      self.setLoginForm();

      self.settings.init = true;
      return self.settings.init;
    },

// Helper Methods
    getJSONFormData : function($form){
      var unindexed_array = $form.serializeArray();
      var indexed_array = {};

      $.map(unindexed_array, function(n, i){
          indexed_array[n['name']] = n['value'];
      });

      return JSON.stringify(indexed_array);
    },

    bookstoreAjaxAdaptor : function(route, data, successCallback, verbType) { // only handles success, refactor
      var self = this,
          verbType = verbType || "GET";
      return $.ajax({
        type: verbType,
        contentType: "application/json",
        url: self.apiHost + route,
        data: data,
        processData: false,
        dataType: "json",
        scope: self,
        headers: {"X-Bookstore-Token": self.authToken}
      }).done(successCallback);
    },

// App Code
    setLoginForm : function() {
      var self = this;
      self.settings.$loginButton.on('click',function() {
        var formData = self.getJSONFormData(self.settings.$loginForm);
        self.bookstoreAjaxAdaptor(self.routes.login,formData, self.cb_doLogin, "POST");
        return false;
      });
      return self;
    },

    setAuthToken : function(tokenValue) {
        var self = this;
        self.authToken = tokenValue;
    },

    getBookstore : function() {
        var self = this;
        self.bookstoreAjaxAdaptor(self.routes.books + self.currentSort ,null,self.cb_renderBooks);
        return self;
    },

    setBookCreate : function() {
      var self = this;
      self.settings.$createTrigger.on('click',function() {
        self.settings.$createContainer.foundation('reveal', 'open');
      });
      self.settings.$createButton.on('click',function() {
        var formData = self.getJSONFormData(self.settings.$createForm);
        self.bookstoreAjaxAdaptor(self.routes.books,formData,self.cb_createBook,"POST");
        return false;
      })
      return self;
    },

    setBookEdit : function() {
      var self = this;
      
      self.settings.$updateButton.on('click',function() {
        var formData = self.getJSONFormData(self.settings.$editForm),
            bookId = $('input[data-model="bookId"]',self.settings.$detailContainer).val();
        self.bookstoreAjaxAdaptor(self.routes.books + "/" + bookId,formData,self.cb_updateBook,"PUT");
        return false;
      });
      self.settings.$deleteButton.on('click', function() {
        var formData = self.getJSONFormData(self.settings.$editForm),
            bookId = $('input[data-model="bookId"]',self.settings.$detailContainer).val();
        self.bookstoreAjaxAdaptor(self.routes.books + "/" + bookId,formData,self.cb_deleteBook,"DELETE");
        return false;
      })
      return self;
    },
    setBookSort : function() {
      var self = this;
      self.settings.$sortByNewestButton.on('click',function() {
        self.currentSort = '?newest';
        self.settings.$sortByOldestButton.removeClass('active');
        $(this).toggleClass('active');
        self.bookstoreAjaxAdaptor(self.routes.books + self.currentSort ,null,self.cb_renderBooks);
      });
      self.settings.$sortByOldestButton.on('click',function() {
        self.currentSort = '?oldest';
        self.settings.$sortByNewestButton.removeClass('active');
        $(this).toggleClass('active');
        self.bookstoreAjaxAdaptor(self.routes.books + self.currentSort ,null,self.cb_renderBooks);
      });
      
    },

// Callbacks   
    cb_doLogin : function(data,textStatus,request) {
      this.scope.setAuthToken(request.getResponseHeader('X-Bookstore-Token'));
      this.scope.getBookstore()
                .setBookCreate()
                .setBookEdit()
                .setBookSort();
    },

    cb_renderBooks : function(data,textStatus,request) {
        var self = this.scope,
            books = data.items;
        self.settings.$listRepeater.empty(); 
        for (var i=0; books[i]; i++) {
            var book = books[i];
            self.bookstoreAjaxAdaptor(book.href,null,self.cb_renderBookSummary);
        }

        self.ui_showBookstore();
    },

    cb_createBook : function(data,textStatus,request) {
      var self = this.scope;
      self.settings.$detailContainer.foundation('reveal', 'close');
      self.ui_renderBookHtml(data,'new');  
    },

    cb_updateBook : function(data,textStatus,request) {
      var self = this.scope,
          row = $("#" + data.id);
          self.settings.$detailContainer.foundation('reveal', 'close');
          self.ui_renderBookHtml(data,'new', row);  
    },

    cb_deleteBook : function(data,textStatus,request) {
      var self = this.scope,
          row = $("#" + data.deletedBookId);
      self.settings.$detailContainer.foundation('reveal', 'close');
      row.addClass('deleted');
      row.fadeOut(function() {
        row.remove();
      })
    },

    cb_renderBookSummary : function(data,textStatus,request) {
      var self = this.scope;
      self.ui_renderBookHtml(data);      
    },

    cb_renderBookDetail : function(data,textStatus,request) {
        var self = this.scope,
            template = self.settings.$detailContainer;

        $('input[data-model="bookId"]',template).val(data.id);
        $('label[data-model="title"] > input.field-input',template).val(data.title);
        $('label[data-model="author"] > input.field-input',template).val(data.author);
        self.settings.$detailContainer.foundation('reveal', 'open');
    },

// UI Manipulation
    ui_showBookstore : function() {
      var self = this;
      if (self.loginScreen === 'visible') {
        self.settings.$loginForm.fadeOut(function() {
          self.settings.$listContainer.fadeIn();
          self.loginScreen = 'hidden';
        });
      }

      
    },
    ui_renderBookHtml : function(data,klassName,row) {
      var self = this,
          klassName = klassName || '',
          $row = row || $(document.createElement('tr')),
          $cell = $(document.createElement('td')),
          $link = $(document.createElement('a')),
          bookLink = data._links.filter(function (row) {
            if(row.rel === 'self') {
              return true;
            } else {
              return false;
            }
          })[0];
          $row.empty(); // for updating
          $link.attr('href',bookLink.href);
          $link.append(document.createTextNode(data.title));
          
          $link.on('click',function() {
              self.bookstoreAjaxAdaptor(bookLink.href,null,self.cb_renderBookDetail);
              return false;
          });

          $cell.append($link);
          $row.append($cell);

          $cell = $(document.createElement('td'));
          $cell.append(document.createTextNode(data.author));
          $row.attr('id',data.id);
          $row.append($cell);

          $row.addClass(klassName);
          if (klassName === 'new') {
            $row.css('display','none')
            $row.prependTo(self.settings.$listRepeater);
            $row.fadeIn();
            var to = setTimeout(function() {
              row.toggleClass(klassName);
            },3000);
          } else {
            $row.appendTo(self.settings.$listRepeater);
          }
          
    }
  };

  Nerati.App.init();
}
());



