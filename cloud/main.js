var _ = require('underscore')
var fb = require('cloud/pattern-order.js')
var keys = require('cloud/keys.js')

var Book = Parse.Object.extend("Book")
var BookVersion = Parse.Object.extend("BookVersion")

var beforeSaveBook = require('cloud/before-save-book.js')
var BookCollection = require('cloud/book-collection.js')
var searchFunction = require('cloud/search.js')


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

    // Los datos se actualizaron y hay que actualizarlos en el Search Engine 
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





