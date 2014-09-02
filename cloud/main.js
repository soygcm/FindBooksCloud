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

                console.log("1 ------ FB: success Cloud.httpRequest")

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

        var self = this
        var googleIds = this.googleIds(response)

		var query = new Parse.Query(Book)
		query.containedIn("idGBook", googleIds)
		query.find().then(function(results) {

			console.log("2 ------ FB: finding existents: "+ results.length)

			//Increment existent books and Replace into search
			for (var i = 0, endI = results.length; i < endI; i++) {
				var newBook = results[i]

				for (var j = 0, endJ = response.items.length; j < endJ; j++) {
        			var book = response.items[j]


                    if (!(book instanceof Book) && book.id == newBook.get('idGBook')) {
                    
                        console.log("3."+i+"."+j+" ------ FB: compare: "+ newBook.get('idGBook') +", "+ book.id+", "+ (book instanceof Book))
                        
                        console.log("3."+i+"."+j+" ------ FB: Replace from google results: "+newBook.get('title'))
                        
                        response.items[j] = newBook
                        // response.items[j].increment("searchGBook")
                    }
        		}
			}


			//Add books to the collection (pre existents and news)
			var existent = 0

			for (var i = 0, end = response.items.length; i < end; i++) {
        		var book = response.items[i]
        		console.log(book)
        		var newBook
        		
        		if (book instanceof Book) {
        			newBook = book
        			existent++
        		}else{
        			newBook = self.newBookFromGoogle(book)
        		}
            	self.add(newBook)
        	}

        	console.log("5 ------ FB: previous existent: "+ existent)
        
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
