var _ = require('underscore')
var fb = require('cloud/pattern-order.js')
var keys = require('cloud/keys.js')

var Book = Parse.Object.extend("Book")
var BookVersion = Parse.Object.extend("BookVersion")


Parse.Cloud.beforeSave("Book", function(request, response) {

    // Comprimir y cortar la imagen de los libros:;

    var book = request.object

    var title               = book.dirty("title")
    var subtitle            = book.dirty("subtitle")
    var authors             = book.dirty("authors")
    var publisher           = book.dirty('publisher')
    var publishedDate       = book.dirty('publishedDate')
    var description         = book.dirty('description')
    var industryIdentifiers = book.dirty('industryIdentifiers')

    var imageThumbnail      = book.dirty('imageThumbnail')
    var image               = book.dirty('image')
    var imageMedium         = book.dirty('imageMedium')
    var imageLinks          = book.dirty('imageLinks')

    var mainCategory        = book.dirty('mainCategory')
    var categories          = book.dirty('categories')
    var verageRating        = book.dirty('verageRating')
    var ratingsCount        = book.dirty('ratingsCount')
    var language            = book.dirty('language')
    var bookbinding         = book.dirty('bookbinding')

    // Nueva Version necesaria *NV campos sucios:
    var newVersion = (title || subtitle || authors || publisher || publishedDate || description || industryIdentifiers || imageLinks || imageThumbnail || image || imageMedium)

    // Campos sucios para la version
    var dirtyFields = new Array()
    var fields = ['title' , 'subtitle' , 'authors' , 'publisher' , 'publishedDate' , 'description' , 'industryIdentifiers' , 'imageLinks' , 'imageThumbnail' , 'image' , 'imageMedium']

    for (var i = fields.length - 1; i >= 0; i--) {
        // var dirtyField = {field:"", dirty:false}
        var dirtyField = {}
        dirtyField.field = fields[i]
        dirtyField.dirty = book.dirty(fields[i])
        dirtyFields.push(dirtyField)
    }

    book.set("dirty", dirtyFields)

    // Motor de Busqueda *SE campos: 
    var newSearchData = (title || subtitle  || authors || publisher || publishedDate || description || industryIdentifiers || mainCategory || categories || verageRating || ratingsCount || language || bookbinding)

    // crear nueva version solo si algun campo de nueva version esta sucio, pero si el campo noVersion es verdadero entonces no crea una nueva version
    if ( newVersion && !book.get("noVersion") ){
        book.set("newVersion", true)
    }else{
        book.set("newVersion", false)
    }

    // actualizar los datos de busqueda solo si los newSearchData campos estan sucios
    if ( newSearchData ){
        book.set("newSearchData", true)
    }else{
        book.set("newSearchData", false)
    }

    response.success()

})


Parse.Cloud.afterSave("Book", function(request) {

    // Guardar una Revision con los campos repetidos del libro que se acaba de guardar, hacerlo si es nuevo y si es un update.
    // Hacer esto solo cuando los campos "metadata" han sido modificadoss. 

    // Obtener los datos para guardarlos:

    var book = request.object
    var dirty = book.get("dirty")

    if ( book.get("newVersion") ){

        // duplicar los campos:
        // var newVersionData =  ['title', 'subtitle', 'authors', 'publisher', 'publishedDate', 'description', 'industryIdentifiers', 'imageThumbnail', 'image', 'imageMedium', 'imageLinks']

        var bookVersion = new BookVersion()

        for (var i = dirty.length - 1; i >= 0; i--) {
            if (dirty[i].dirty){
                bookVersion.set(dirty[i].field, book.get( dirty[i].field ))
            }
        }

        // Si es un nuevo libro, poner la version de el libro y el BookVersion en 0:
        if (!book.existed()) {
            bookVersion.set("version", 0)
            book.set("version", 0)

        }

        // Si es un update de un libro, se aumenta la version en +1:
        else{
            var version = book.get("version")
            bookVersion.set("version", version+1)
            book.set("version", version+1)

        }

        bookVersion.set("book", new Book({id: book.id}) )
        book.set("current", bookVersion)

        bookVersion.save().then(function  (bookVersion) {
            book.save()
        }, function (error) {
           console.log(error)
        })

    }

    // Los datos se actualizaron, pero no es necesario crear una nueva version 
    if ( book.get("newSearchData") ) {

        // Enviar datos para busqueda a Swiftype, hay que tomar en cuenta que las ediciones/versiones/actualizaciones deben modificar el valor que esta en swiftype, solo un nuevo libro hace un 'document'

        var title                 = book.get("title")
        var subtitle              = book.get("subtitle") || ""
        var authors               = book.get("authors") || []
        var publisher             = book.get('publisher') || ""
        var publishedDate         = book.get('publishedDate') || ""
        var description           = book.get('description') || ""
        var industryIdentifiers   = book.get('industryIdentifiers') || []
        var verageRating          = book.get('verageRating') || 0
        var ratingsCount          = book.get('ratingsCount') || 0
        var language              = book.get('language') || ""
        var bookbinding           = book.get('bookbinding') || ""
        var categories            = book.get('categories') || []
        var mainCategory          = book.get('mainCategory') || ""
        var googleId              = book.has('idGBook')

        industryIdentifiersData = new Array()
        for (var i = industryIdentifiers.length - 1; i >= 0; i--) {
            industryIdentifiersData.push( industryIdentifiers[i].identifier )
        }

        Parse.Cloud.httpRequest({
            method: 'POST',
            url: 'https://api.swiftype.com/api/v1/engines/findbooks/document_types/books/documents/create_or_update.json',
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: {
                auth_token: keys.swiftype,
                document: {
                    "external_id": book.id,
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
                        },
                        {   "name": "publisher",
                            "value": publisher, 
                            "type": "enum"
                        },
                        {   "name": "publishedDate",
                            "value": publishedDate, 
                            "type": "date"
                        },
                        {   "name": "description",
                            "value": description, 
                            "type": "text"
                        },
                        {   "name": "industryIdentifiers",
                            "value": industryIdentifiersData, 
                            "type": "string"
                        },
                        {   "name": "verageRating",
                            "value": verageRating, 
                            "type": "float"
                        },
                        {   "name": "ratingsCount",
                            "value": ratingsCount, 
                            "type": "integer"
                        },
                        {   "name": "language",
                            "value": language, 
                            "type": "enum"
                        },
                        {   "name": "bookbinding",
                            "value": bookbinding, 
                            "type": "enum"
                        },
                        {   "name": "categories",
                            "value": categories, 
                            "type": "string"
                        },
                        {   "name": "mainCategory",
                            "value": mainCategory, 
                            "type": "string"
                        },
                        {   "name": "googleId",
                            "value": googleId, 
                            "type": "enum"
                        }
                    ]
                }
            },
            success: function(httpResponse) {
                console.log('Swiftype: ' + httpResponse.text)
            },
            error: function(httpResponse) {
                console.error('Swiftype Error: ' + httpResponse.text)
            }
        })

    }

})


Parse.Cloud.define("search", function(request, response) {

	this.bookCollection = new BookCollection()
	this.bookCollection.query = request.params.query
    this.bookCollection.fetch({
        success:function(collection, existent){
            response.success(collection)
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
                auth_token: 'D7fDZNDrvLEh9XDfCqeB',
                q: this.query,
                per_page: 5
            },
            success: function(httpResponse) {

                console.log("Search Swiftype Done")
                
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
                        alert("Error: " + error.code + " " + error.message)
                    }

                })
        
            },
            error: function(httpResponse) {
                console.error('Search Swiftype Error ' + httpResponse.text)
            }
        })
        

    },

    successEnd: function(options){
        if(this.successParse && this.successGoogle){


            Parse.Object.saveAll(this.models, {
                success: function(list) {
                    options.success(this)
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
