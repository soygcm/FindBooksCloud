Parse.Cloud.afterSave("Book", function(request) {

    var book = request.object

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