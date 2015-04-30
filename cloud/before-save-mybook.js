function sendPush(myBook, users, response){

    var book = myBook.get("book")
    book.fetch().then(function(book) {

        var bookTitle = book.get("title")

        var query = new Parse.Query(Parse.Installation)
        query.containedIn("user", users);

        Parse.Push.send({
          where: query,
          data: {
            alert: bookTitle+ ', tiene una nueva oferta'
            // uri: 'findbooks://mybook/?bookid='+book.id
          }
        }, {
          success: function() {
            response.success()
          },
          error: function(error) {
            response.error(error)
            console.log(error)
          }
        })

    }, function(error) {
        response.error(error)
        console.log(error)
    })
}

function sendPushAllWants(myBook, response){
    // var text = "Hay una nueva oferta para Nombre del libro"

    /** 
    * Obtener los usuarios a los cuales notificar
    * query de todos los WANT relacionados con este OFFER
    * especificamente este "Book"
    */

    var book = myBook.get("book")

    // var query = new Parse.Query(Parse.Installation)
    // query.equalTo('user', userTo)

    var MyBook = Parse.Object.extend("MyBook")
    var query = new Parse.Query(MyBook)
    query.equalTo("type", "WANT")
    query.equalTo("book", book)
    query.find({
        success: function(results) {

            var users = []
            
            for (var i = 0; i < results.length; i++) { 
                var myBook = results[i]
                var user = myBook.get('user')
                users.push(user)
            }

            sendPush(myBook, users, response)

        },
        error: function(error) {
            console.log(error)
        }
    })
    

}



Parse.Cloud.beforeSave("MyBook", function(request, response) {

    Parse.Cloud.useMasterKey()
    var myBook = request.object
    var type = myBook.get("type")

    /**
     * Cuando es un Offer
     * Si editan la info Agregar la info de precio al 'Book'
     * Si es nuevo incrementar el contador de los 'Book'  
    */
    // if(type == "OFFER"){

        var book = myBook.get("book")
        var erase = myBook.get("delete")

        var counter;
        /*
        * evitar precios undefined
        */

        if(type == "OFFER"){
            var price = myBook.get("price")
            // console.log("el precio es: "+price)
            if (typeof price == 'undefined'){
                myBook.set("price", 0)
                // console.log("Precio redefinido a 0")
            }else{
                // console.log(price)
                // console.log("el precio no es undefined?")
            }
            counter = "offersCount"
        }else{
            counter = "wantsCount"
        }

        // var deletedPrev = myBook.previous("deleted")
        // var deleted = deleted != deletedPrev
        // var nohaycambios = true

        

        if(myBook.isNew()){
            
            book.increment(counter)

            book.save().then(function  (book) {
                response.success()
            }, function (error) {
                console.log(error)
                response.error(error)
            })

        }else if(erase){

            book.increment(counter, -1)
            
            myBook.set("delete", false)

            book.save().then(function  (book) {
                response.success()
            }, function (error) {
                console.log(error)
                response.error(error)
            })

        }else{

            response.success()
        }
    // }else{
        // response.success()
    // }

    /**
    * transactionCount, no puede valer menos de 0
    */

})

/** 
* Notificar que alguien subio una oferta del libro que desean
* Lo voy a hacer en afterSave, para no 
* darle problemas al que crea la oferta
* si funciona el push o no
*/

Parse.Cloud.afterSave("MyBook", function(request) {

    response = {
        error: function(e){
        },
        success: function(){
        }
    }

    var myBook = request.object
    var type = myBook.get("type")
    var price = myBook.get("price")

    /**
    * Si es un myBook OFFER nuevo, enviar push
    * a todos los usuarios que tienen un myBook WANT de
    * este libro
    */
    if( !myBook.existed() && type == "OFFER" ){

        sendPushAllWants(myBook, response)

    }

    if(type == "OFFER"  && price == 0){

        var pubnub = {
         'publish_key' : 'pub-c-9686d089-a205-41b5-83f0-650a4523095e',
         'subscribe_key' : 'sub-c-dddc717a-dd4f-11e4-bad1-02ee2ddab7fe' 
        }
        var channel = "50k"

        var MyBook = Parse.Object.extend("MyBook")
        var query = new Parse.Query(MyBook)
        query.equalTo("price", 0)
        query.equalTo("type", "OFFER")
        // query.notEqualTo("deleted", true)
        query.count({
          success: function(count) {

            console.log("MyBook free " + count + " offers")

            var message = {count:count}
            Parse.Cloud.httpRequest({ 
                url: 'http://pubsub.pubnub.com/publish/' +
                    pubnub.publish_key + '/' + 
                    pubnub.subscribe_key + '/0/' + 
                    channel + '/0/' + 
                    encodeURIComponent(JSON.stringify(message)),   

                success: function(httpResponse) {
                    console.log(httpResponse.text)
                },  
                error: function(httpResponse) { 
                    console.error('Request failed ' + httpResponse.status) 
                }
            })


          },
          error: function(error) {

          }
        })
    }

})