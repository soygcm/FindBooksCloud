var BookVersion = Parse.Object.extend("BookVersion")
var Book = Parse.Object.extend("Book")

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

    // crear nueva version solo si algun campo de nueva version esta sucio, pero si el campo noVersion es verdadero entonces no crea una nueva version.
    // Si el libro es nuevo tampoco crea una nueva Version.
    newVersion =  newVersion && !book.get("noVersion") && !book.isNew()

    // verificar si estos campos estan sucios para la version
    var dirty = new Array()
    var fields = ['title' , 'subtitle' , 'authors' , 'publisher' , 'publishedDate' , 'description' , 'industryIdentifiers' , 'imageLinks' , 'imageThumbnail' , 'image' , 'imageMedium']

    for (var i = fields.length - 1; i >= 0; i--) {
        var dirtyField = {}
        dirtyField.field = fields[i]
        dirtyField.dirty = book.dirty(fields[i])
        dirty.push(dirtyField)
    }

    // Motor de Busqueda *SE campos: 
    // actualizar los datos de busqueda solo si los newSearchData campos estan sucios
    var newSearchData = (title || subtitle  || authors || publisher || publishedDate || description || industryIdentifiers || mainCategory || categories || verageRating || ratingsCount || language || bookbinding)

    book.set("newSearchData", newSearchData)

    // --------------------------------------------------

    // Guardar una Revision con los campos repetidos del libro que se acaba de guardar, hacerlo si es nuevo y si es un update.
    // Hacer esto solo cuando los campos "metadata" han sido modificadoss. 

    // Obtener los datos para guardarlos:

    if ( newVersion ){

        // duplicar los campos:
        // solo duplica los campos sucios

        var bookVersion = new BookVersion()

        for (var i = dirty.length - 1; i >= 0; i--) {
            if (dirty[i].dirty){
                bookVersion.set(dirty[i].field, book.get( dirty[i].field ))
            }
        }

		// se aumenta la version en +1:
        
        var version = book.get("version") || 0
        bookVersion.set("version", version+1)
        book.set("version", version+1)

        bookVersion.set("book", new Book({id: book.id}) )
        book.set("current", bookVersion)

        bookVersion.save().then(function  (bookVersion) {
          	response.success()
        }, function (error) {
          	console.log(error)
          	response.error(error)
        })

    }else{
    	response.success()
    }

})