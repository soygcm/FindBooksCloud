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