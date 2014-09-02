var _ = require('underscore')

Parse.Cloud.beforeSave("Book", function(request, response) {
	var picture = request.object.get("picture")
	if (picture) {

		console.log("Hacer halgo con la imagen")

		response.success()
	
	}else{

		response.success()
		
	}


})

Parse.Cloud.define("search", function(request, response) {

	this.bookCollection = new BookCollection()
	this.bookCollection.query = request.params.query
    this.bookCollection.fetch({
        success:function(collection){

        	Parse.Object.saveAll(collection, {
			    success: function(list) {
			    	response.success(collection)
			    },
			    error: function(error) {
			    	response.error(error)
			    },
			})

        },
        error: function (collection, error) {
        	response.error("no results search")
        }
    })

})

var Book = Parse.Object.extend("Book")

var BookCollection = Parse.Collection.extend({
    model: Book,
    query: '',
    successParse: true,
    successGoogle: false,
    url: "https://www.googleapis.com/books/v1/volumes",
    fetch: function(options) {
        var self = this
        var options = options || {}

        //Get Google
        Parse.Cloud.httpRequest({
			url : this.url,
			params 	: {
				q : this.query,
				maxResults	: 5
			},
			headers: {
				'Content-Type': 'application/json;charset=utf-8'
			},
			success 	: function(httpResponse) {
				self.fetchCallback(httpResponse.data, options)
			},
			error 	: function(httpResponse) {
				console.error('Request failed with response code ' + httpResponse.status)
			}
		})

        //Get Parse 
        /*console.log(this.query, makePattern(this.query))
        var query = new Parse.Query(Book)
        query.matches("title", makePattern(this.query))
        query.find({
          success: function(results) {

            results = orderResults(results, self.query)
            results.splice(5,results.length)
            self.add(results, {silent: true})
            self.successParse = true
            self.success(options)
          },
          error: function(error) {
            alert("Error: " + error.code + " " + error.message)
          }
        })
        */

    },
    successEnd: function(options){

        if(this.successParse && this.successGoogle){
            options.success(this)
        }
        
    },
    googleIds: function (response) {
    	var googleIds = new Array()
    	for (var i = 0, end = response.items.length; i < end; i++) {
        	var book = response.items[i]
        	googleIds.push(book.id)
        }
        return googleIds
    },

    //request Google Books Success
    fetchCallback: function(response, options) {

    	console.log("FB calling fetchCallback")

        var self = this
        var googleIds = this.googleIds(response)

		var query = new Parse.Query(Book)
		query.containedIn("idGBook", googleIds)
		query.find().then(function(results) {

			console.log("FB finding existents: "+ results.length)

			//Increment existent books and Replace into search
			for (var i = 0, end = results.length; i < end; i++) {
				var newBook = results[i]
				newBook.increment("searchGBook")

				for (var j = 0, end = response.items.length; j < end; j++) {
        			var book = response.items[j]
        			if (book.id == newBook.get('idGBook')) {
        				console.log("FB Replace from google results: "+j+": "+book.volumeInfo.title)
        				console.log(response.items[j])
        				response.items[j] = newBook
        				console.log(response.items[j])
        			}
        		}
			}


			//Add books to the collection (pre existents and news)
			var existent = 0

			for (var i = 0, end = response.items.length; i < end; i++) {
        		var book = response.items[i]
        		console.log(book)
        		var newBook
        		
        		if (book.objectId) {
        			newBook = book
        			existent++
        		}else{
        			newBook = self.newBookFromGoogle(book)
        		}
            	self.add(newBook)
        	}

        	console.log("FB previous existent: "+ existent)
        
        	self.successGoogle = true
        	self.successEnd(options)


		},
		function(error) {
			console.log("Error: " + error.code + " " + error.message)
		})

    },
    newBookFromGoogle: function (book) {

    	var newBook = new Book()
    	
		if (typeof(book.volumeInfo.title) != "undefined"){
		    newBook.set('title', book.volumeInfo.title)
        }
        if (typeof(book.volumeInfo.subtitle) != "undefined"){
            newBook.set('subtitle', book.volumeInfo.subtitle)
        }
        if (typeof(book.volumeInfo.authors) != "undefined"){
            newBook.set('authors', book.volumeInfo.authors)
        }
        if (typeof(book.volumeInfo.imageLinks) != "undefined"){
            newBook.set('thumbnails', book.volumeInfo.imageLinks)
        }

        if (typeof(book.id) != "undefined"){
            newBook.set('idGBook',  book.id)
        }

        return newBook

    }
})
