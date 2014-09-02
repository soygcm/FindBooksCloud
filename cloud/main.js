var _ = require('underscore');

Parse.Cloud.beforeSave("Book", function(request, response) {
	var picture = request.object.get("picture")
	if (picture) {


		response.success(request.object, "Hacer halgo con la imagen")
	
	}else{

		response.success();
		
	}


})

{"code":141,"error":"TypeError: Cannot call method 'bindAll' of undefined\n    at Parse.Collection.extend.initialize (main.js:39:11)\n    at t.Collection (Parse.js:1:48687)\n    at new r.hasOwnProperty.s (Parse.js:1:12954)\n    at main.js:18:24"}

Parse.Cloud.define("search", function(request, response) {

	this.bookCollection = new BookCollection()

	this.bookCollection.query = request.params.query
    this.bookCollection.fetch({
        success:function(collection){
            response.success(collection)
        },
        error: function () {
        	response.error("no results search")
        }
    })
})

var Book = Parse.Object.extend("Book");

var BookCollection = Parse.Collection.extend({
    model: Book,
    query: '',
    successParse: true,
    successGoogle: false,
    initialize: function() {
        _.bindAll(this, 'url', 'fetch', 'fetchCallback');
    },
    fetch: function(options) {
        var self = this;
        self.reset();
        var options = options || {};

        //Get Google

        Parse.Cloud.httpRequest({
		  url 		: this.url(),
		  params 	: {
		    q 			: this.query,
		    maxResults	: 5
		  },
		  success 	: function(httpResponse) {
		    console.log(httpResponse.text);
		  },
		  error 	: function(httpResponse) {
		    console.error('Request failed with response code ' + httpResponse.status);
		  }
		});

        $.getJSON(this.url(),{q: this.query, maxResults: 5}, 
            function(response) {
                self.fetchCallback(response, options); 
            },'jsonp');

        //Get Parse 
        /*console.log(this.query, makePattern(this.query));
        var query = new Parse.Query(Book);
        query.matches("title", makePattern(this.query));
        query.find({
          success: function(results) {

            results = orderResults(results, self.query);
            results.splice(5,results.length);
            self.add(results, {silent: true});
            self.successParse = true;
            self.success(options);
          },
          error: function(error) {
            alert("Error: " + error.code + " " + error.message);
          }
        });
        */

    },
    success: function(options){

        if(this.successParse && this.successGoogle){
            this.trigger('change');
            options.success(this);
            
        }
        
    },
    fetchCallback: function(response, options) {
        var self = this;
        // self.reset();
        _.each(response.items, function(book, i) {
            newBook = new Book();
            if (typeof(book.volumeInfo.title) != "undefined"){
                newBook.set('title', book.volumeInfo.title);
            }
            if (typeof(book.volumeInfo.subtitle) != "undefined"){
                newBook.set('subtitle', book.volumeInfo.subtitle);
            }else{
                newBook.set('subtitle', '');
            }
            if (typeof(book.volumeInfo.authors) != "undefined"){
                newBook.set('authors', book.volumeInfo.authors);
            }
            if (typeof(book.volumeInfo.imageLinks) != "undefined"){
                newBook.set('thumbnails', book.volumeInfo.imageLinks);
            }
            if (typeof(book.id) != "undefined"){
                newBook.set('idGBook',  book.id);
            }
            self.add(newBook,{ silent: false }); 
        });
        
        // options.success(self);
        this.successGoogle = true;
        this.success(options);

    },
    url: function() {
        return "https://www.googleapis.com/books/v1/volumes";
         // + this.query;
    }
});
