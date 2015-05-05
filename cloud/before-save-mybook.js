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

    var myBook = request.object
    var type = myBook.get("type")

    /*
    * evitar precios undefined
    */
    if(type == "OFFER"){
        var price = myBook.get("price")

        if (typeof price == 'undefined'){
            myBook.set("price", 0)
        }
    }

    response.success()

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
            console.log(e)
        },
        success: function(){
        }
    }

    var myBook = request.object
    var type = myBook.get("type")
    var price = myBook.get("price")
    var book = myBook.get("book")
    // para solo contar al eliminar una vez y 
    // no siempre que se modifique el myBook y 
    // deleted sea true
    var erase = myBook.get("delete")


    /**
    * Si es un myBook OFFER nuevo, enviar push
    * a todos los usuarios que tienen un myBook WANT de
    * este libro
    */
    if( !myBook.existed() && type == "OFFER" ){

        sendPushAllWants(myBook, response)

    }

    /**
    * contar ofertas que "lo quiero"
    */
    var functionCount = "updateBookCounters"
    var params = { id: book.id, type: type }        

    if( !myBook.existed() ){

        Parse.Cloud.run(functionCount, params).then(function() {
            response.success()
        }, response.error)
        
    }else if(erase){
        
        myBook.set("delete", false)

        myBook.save().then(function(object) {
            return Parse.Cloud.run(functionCount, params)
        }, response.error).then(function(object) {
            response.success()
        }, response.error)

    }


    /**
    * enviar push para 50k
    */
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
          error: response.error
        })
    }

})