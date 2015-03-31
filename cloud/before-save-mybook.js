Parse.Cloud.beforeSave("MyBook", function(request, response) {

    Parse.Cloud.useMasterKey()
    var myBook = request.object
    var type = myBook.get("type")

    /**
     * Cuando es un Offer
     * Si editan la info Agregar la info de precio al 'Book'
     * Si es nuevo incrementar el contador de los 'Book'  
    */
    if(type = "OFFER"){

        var book = myBook.get("book")
        var deleted = myBook.get("deleted")
        var deletedPrev = myBook.previous("deleted")

        var deleted = deleted != deletedPrev

        // var nohaycambios = true

        if(myBook.isNew()){
            
            book.increment("offersCount")

            book.save().then(function  (book) {
                response.success()
            }, function (error) {
                console.log(error)
                response.error(error)
            })

        }else if(deleted){

            book.increment("offersCount", -1)

            book.save().then(function  (book) {
                response.success()
            }, function (error) {
                console.log(error)
                response.error(error)
            })

        }else{
            response.success()
        }
    }else{
        response.success()
    }

    
    /**
    * transactionCount, no puede valer menos de 0
    */





})