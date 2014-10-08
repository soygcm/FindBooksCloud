var Book = Parse.Object.extend("Book")

exports.BookCollection = Parse.Collection.extend({
    model: Book,
    query: '',
    successParse: false,
    successGoogle: false,
    preExistent: 0,
    urlGoogle: "https://www.googleapis.com/books/v1/volumes",
    urlSwiftype: 'https://api.swiftype.com/api/v1/engines/findbooks/document_types/books/search.json',
    fetch: function(options) {
        var self = this
        var options = options || {}

        //Get Google
        Parse.Cloud.httpRequest({
			url : this.urlGoogle,
			params: {
				q : this.query,
				maxResults	: 5
			},
			headers: {
				'Content-Type': 'application/json;charset=utf-8'
			},
			success: function(httpResponse) {
				self.googleSuccess(httpResponse.data, options)
			},
			error: function(httpResponse) {

                self.successGoogle = true
                self.successEnd(options)

				console.error('Request failed with response code ' + httpResponse.status)
			}
		})

        // Buscar en Swiftype
        // filters : { "books": {"googleId":false} }
        Parse.Cloud.httpRequest({
            method: 'POST',
            url: 'https://api.swiftype.com/api/v1/engines/findbooks/document_types/books/search.json',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: {
                "auth_token":   'D7fDZNDrvLEh9XDfCqeB',
                "q":            this.query,
                "per_page":     5,
                "filters":      {
                    "googleId": false
                }
            },
            success: function(httpResponse) {
                
                var books = httpResponse.data.records.books
                var ids = new Array()

                for (var i = 0, end = books.length; i < end; i++) {
                    ids.push(books[i].external_id)
                }

                //Get Parse 
                var query = new Parse.Query(Book)

                query.containedIn("objectId", ids)
                query.doesNotExist("idGBook")

                query.find({

                    success: function(results) {
                        self.add(results)
                        self.preExistent += results.length
                        self.successParse = true
                        self.successEnd(options)
                    },

                    error: function(error) {

                        self.successParse = true
                        self.successEnd(options)

                        console.error("Error: " + error.code + " " + error.message)
                    }

                })
        
            },
            error: function(httpResponse) {
                self.successParse = true
                self.successEnd(options)

                console.error('Search Swiftype Error ' + httpResponse.text)
            }
        })
        

    },

    successEnd: function(options){
        if(this.successParse && this.successGoogle){

            // Hacer una nueva coleccion y guardarla para devolverla
            self = this;

            Parse.Object.saveAll(this.models, {
                success: function(list) {

                    var ids = new Array()
                    for (var i = 0, end = list.length; i < end; i++) {
                        console.log(list[i].id)
                        ids.push( list[i].id )
                    }

                    var ResultCollection = Parse.Collection.extend({
                        model: Book,
                        query: (new Parse.Query(Book)).containedIn("objectId", ids)
                    })
                    var collection = new ResultCollection()
                    collection.add(list)

                    collection.fetch({
                        success: function (list){
                            options.success(collection)
                        }
                    });

                },
                error: function(error) {
                    options.error(error)
                },
            })

            
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

    //google Success
    googleSuccess: function(googleResults, options) {

        var googleBooks = googleResults.items

        var self = this
        var googleIds = this.googleIds(googleResults)

		var query = new Parse.Query(Book)
		query.containedIn("idGBook", googleIds)
		query.find().then(function(parseBooks) {

			//Insertar libros de parse a la busqueda de google
			for (var i = 0, endI = parseBooks.length; i < endI; i++) {
				
                var parseBook = parseBooks[i]

				for (var j = 0, endJ = googleBooks.length; j < endJ; j++) {
        			
                    var book = googleBooks[j]
                    if (!(book instanceof Book) && book.id == parseBook.get('idGBook')) {
                        googleBooks[j] = parseBook
                    }
        		}
			}

			//Agregar libros a la collection (pre existentes y nuevos)
			var existent = 0

			for (var i = 0, end = googleBooks.length; i < end; i++) {
        		
                var googleBook = googleBooks[i]
        		var newBook
        		
        		if (googleBook instanceof Book) {
        			newBook = googleBook
        			existent++
        		}else{
        			newBook = self.newBookFromGoogle(googleBook)
        		}
            	self.add(newBook)
        	}
        
        	self.successGoogle = true
            self.preExistent += existent
        	self.successEnd(options)
		},
		function(error) {
			console.log("Error: " + error.code + " " + error.message)
		})

    },

    // Agregar un libro desde el api de google.

    newBookFromGoogle: function (book) {

    	var newBook = new Book()

        newBook.set('idGBook',  book.id)
    	
		if (typeof(book.volumeInfo.title) != "undefined"){
		    newBook.set('title', book.volumeInfo.title)
        }
        if (typeof(book.volumeInfo.subtitle) != "undefined"){
            newBook.set('subtitle', book.volumeInfo.subtitle)
        }
        if (typeof(book.volumeInfo.imageLinks) != "undefined"){
            newBook.set('imageLinks', book.volumeInfo.imageLinks)
        }
        if (typeof(book.volumeInfo.publisher) != "undefined"){
            newBook.set('publisher', book.volumeInfo.publisher)
        }
        if (typeof(book.volumeInfo.publishedDate) != "undefined"){
                newBook.set('publishedDate', new Date(book.volumeInfo.publishedDate))
                newBook.set('publishedDateString', book.volumeInfo.publishedDate)
        }
        if (typeof(book.volumeInfo.description) != "undefined"){
            newBook.set('description', book.volumeInfo.description)
        }
        if (typeof(book.volumeInfo.industryIdentifiers) != "undefined"){
            newBook.set('industryIdentifiers', book.volumeInfo.industryIdentifiers)
        }
        if (typeof(book.volumeInfo.pageCount) != "undefined"){
            newBook.set('pageCount', book.volumeInfo.pageCount)
        }
        if (typeof(book.volumeInfo.dimensions) != "undefined"){
            newBook.set('dimensions', book.volumeInfo.dimensions)
        }
        if (typeof(book.volumeInfo.verageRating) != "undefined"){
            newBook.set('verageRating', book.volumeInfo.verageRating)
        }
        if (typeof(book.volumeInfo.ratingsCount) != "undefined"){
            newBook.set('ratingsCount', book.volumeInfo.ratingsCount)
        }
        if (typeof(book.volumeInfo.language) != "undefined"){
            newBook.set('language', book.volumeInfo.language)
        }

        
        


        // Aqui en el futuro estos datos seran Relaciones en el modelo de datos:
        if (typeof(book.volumeInfo.categories) != "undefined"){
            newBook.set('categories', book.volumeInfo.categories)
        }
        if (typeof(book.volumeInfo.mainCategory) != "undefined"){
            newBook.set('mainCategory', book.volumeInfo.mainCategory)
        }
        if (typeof(book.volumeInfo.authors) != "undefined"){
            newBook.set('authors', book.volumeInfo.authors)
        }
        

        return newBook

    }
})