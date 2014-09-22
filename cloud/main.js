var _ = require('underscore')
var fb = require('cloud/pattern-order.js')

var Book = Parse.Object.extend("Book")
var BookVersion = Parse.Object.extend("BookVersion")


Parse.Cloud.beforeSave("Book", function(request, response) {

    // Comprimir y cortar la imagen de los libros:;

    var book = request.object;

    if (    request.object.dirty("title")    
         || request.object.dirty("subtitle")
         || request.object.dirty("authors")     ){

        if (!request.object.get("noVersion")) {
            // Es necesario hacer una nueva version:
            book.set("newVersion", true)
        }else{
            book.set("newVersion", false)
        }

        book.set("updatedData", true)

        response.success()

    }else{

        book.set("newVersion", false)
        book.set("updateData", false)
        response.success()

    }

})


Parse.Cloud.afterSave("Book", function(request) {

    // Guardar una Revision con los campos repetidos del libro que se acaba de guardar, hacerlo si es nuevo y si es un update.
    // Hacer esto solo cuando los campos "metadata" han sido modificadoss. 

    // Obtener los datos para guardarlos:

    var title = request.object.get("title")
    var subtitle = request.object.get("subtitle")
    var authors = request.object.get("authors")
    // var words = request.object.get("words")


    if ( request.object.get("newVersion") ){

        // duplicar los campos:
        var bookVersion = new BookVersion()

        bookVersion.set("title", title)
        bookVersion.set("subtitle", subtitle)
        bookVersion.set("authors", authors)
        // bookVersion.set("words", words)

        // Si es un nuevo libro, poner la version de el libro y el BookVersion en 0:
        if (!request.object.existed()) {
            bookVersion.set("version", 0)
            request.object.set("version", 0)

        }

        // Si es un update de un libro, se aumenta la version en +1:
        else{
            var version = request.object.get("version")
            bookVersion.set("version", version+1)
            request.object.set("version", version+1)

        }

        bookVersion.set("book", new Book({id: request.object.id}) )
        request.object.set("current", bookVersion)

        bookVersion.save().then(function  (bookVersion) {

            request.object.save()

        }, function (error) {
           console.log(error)
        })

    }

    // Los datos se actualizaron, pero no es necesario crear una nueva version 
    if ( request.object.get("updatedData") ) {

        // Enviar datos para busqueda a Swiftype, hay que tomar en cuenta que las ediciones/versiones/actualizaciones deben modificar el valor que esta en swiftype, solo un nuevo libro hace un 'document'

        /*curl -X POST 'https://api.swiftype.com/api/v1/engines/findbooks/document_types/books/documents/create_or_update.json' \
        -H 'Content-Type: application/json' \
        -d '{
              "auth_token": "D7fDZNDrvLEh9XDfCqeB",
              "document": {
                "external_id": "2",
                "fields": [
                    {"name": "title", "value": "my new title", "type": "string"},
                    {"name": "page_type", "value": "user", "type": "enum"}
                ]}
              }'*/

        Parse.Cloud.httpRequest({
            method: 'POST',
            url: 'https://api.swiftype.com/api/v1/engines/findbooks/document_types/books/documents/create_or_update.json',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: {
                auth_token: 'D7fDZNDrvLEh9XDfCqeB',
                document: {
                    "external_id": request.object.id,
                    "fields": [
                        {   "name": "title",
                            "value": title,
                            "type": "string"
                        },
                        {   "name": "subtitle",
                            "value": subtitle,
                            "type": "string"
                        },
                        {   "name": "authors",
                            "value": authors, 
                            "type": "string"
                        }
                    ]
                }
            },
            success: function(httpResponse) {
                console.log(httpResponse.text)
            },
            error: function(httpResponse) {
                console.error('Swiftype: ' + httpResponse.text)
            }
        })

    }

})


Parse.Cloud.define("search", function(request, response) {

	this.bookCollection = new BookCollection()
	this.bookCollection.query = request.params.query
    this.bookCollection.fetch({
        success:function(collection, existent){

            // if (existent >= collection.length) {

            //     console.log("------ ahorrar un request")
            //     response.success(collection)

            // }else{

                Parse.Object.saveAll(collection, {
                    success: function(list) {
                        response.success(collection)
                    },
                    error: function(error) {
                        response.error(error)
                    },
                })

            // }

        	

        },
        error: function (collection, error) {
        	response.error("no results search")
        }
    })

})

var BookCollection = Parse.Collection.extend({
    model: Book,
    query: '',
    successParse: false,
    successGoogle: false,
    preExistent: 0,
    url: "https://www.googleapis.com/books/v1/volumes",
    fetch: function(options) {
        var self = this
        var options = options || {}

        //Get Google
        Parse.Cloud.httpRequest({
			url : this.url,
			params: {
				q : this.query,
				maxResults	: 5
			},
			headers: {
				'Content-Type': 'application/json;charset=utf-8'
			},
			success: function(httpResponse) {
				self.fetchCallback(httpResponse.data, options)
			},
			error: function(httpResponse) {
				console.error('Request failed with response code ' + httpResponse.status)
			}
		})

        //Get Parse 
        var query = new Parse.Query(Book)

        var words = this.query.split(/\s+/)
        words = _.map(words, fb.removeDiacritics)
        words = _.map(words, fb.toLowerCase) 

        // query.matches("title", fb.makePattern(this.query))
        query.containsAll("words", words)

        query.doesNotExist("idGBook")
        query.find({

            success: function(results) {
                // results = fb.orderResults(results, self.query)
                results.splice(5, results.length)
                self.add(results)
                self.preExistent += results.length
                self.successParse = true
                self.successEnd(options)
            },

            error: function(error) {
                alert("Error: " + error.code + " " + error.message)
            }

        })
        

    },

    successEnd: function(options){
        if(this.successParse && this.successGoogle){
            options.success(this, this.preExistent)
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

			// console.log("2 ------ FB: finding existents: "+ results.length)

			//Increment existent books and Replace into search
			for (var i = 0, endI = results.length; i < endI; i++) {
				var newBook = results[i]

				for (var j = 0, endJ = response.items.length; j < endJ; j++) {
        			var book = response.items[j]

                    if (!(book instanceof Book) && book.id == newBook.get('idGBook')) {
                        response.items[j] = newBook
                    }
        		}
			}


			//Add books to the collection (pre existents and news)
			var existent = 0

			for (var i = 0, end = response.items.length; i < end; i++) {
        		var book = response.items[i]
        		var newBook
        		
        		if (book instanceof Book) {
        			newBook = book
        			existent++
        		}else{
        			newBook = self.newBookFromGoogle(book)
        		}
            	self.add(newBook)
        	}

        	// console.log("5 ------ FB: previous existent: "+ existent)
        
        	self.successGoogle = true
            self.preExistent += existent
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
