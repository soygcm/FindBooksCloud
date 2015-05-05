/**
* Enviar un push al @userTo, desde el @userFrom. sobre 
* el libro @book, con el mensaje @options.@message
* y al finalizar o no usar @response
*   sendPush(userFrom, userTo, book, {
        message: function(nickname, bookTitle){
            return nickname + " cancelo, la transacción del libro: "+ bookTitle
        },
        response
    })
*/
function sendPush(transaction, userFrom, userTo, book, options, response){


    userFrom.fetch().then(function(userFrom) {

        return book.fetch()

    }, function(error) {
        response.error(error)
        console.log(error)
    }).then(function(book) {
        
        var bookTitle = book.get("title")
        var userNickname =  userFrom.get("nickname")

        var query = new Parse.Query(Parse.Installation)
        query.equalTo('user', userTo)

        Parse.Push.send({
          where: query,
          data: {
            alert: options.message(userNickname, bookTitle),
            uri: 'findbooks://transaction/?id='+transaction.id
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

/**
* Send notification, cuando la 
* transacción sea nueva
*/
function sendPushNewTransaction(transaction, response){

        var bookWant = transaction.get("bookWant")
        var bookOffer = transaction.get("bookOffer")
        
        var books = [bookWant, bookOffer]

        Parse.Object.fetchAll(books, {
            success: function(list) {
              
                var userTo = bookOffer.get("user")
                var userFrom = bookWant.get("user")                
                var book = bookOffer.get("book")

                sendPush(transaction, userFrom, userTo, book, 
                    {
                        message: function(nickname, bookTitle){
                            return  nickname + " desea adquirir tu libro: "+ bookTitle
                        }
                    },
                    response
                )

            },
            error: function(error) {
              
                response.error(error)
                console.log(error)

            },
        })

}

/**
* Enviar la notificación, cuando se finaliza de un lado
* se le aviza al otro, osea que depende de 
* que lado se finalizo
* 
*/
function sendPushEndTransaction(transaction, response){

    var endedWant = transaction.get("endedWant")
    var endedOffer = transaction.get("endedOffer")

    var bookWant = transaction.get("bookWant")
    var bookOffer = transaction.get("bookOffer")
    
    var books = [bookWant, bookOffer]

    // Necesito obtener nombre de 
    // quien cancelo la transacción y el usuario destino
    // Siempre
    Parse.Object.fetchAll(books, {
        success: function(list) {
              
            var userOffer = bookOffer.get("user")
            var userWant = bookWant.get("user")
            var book = bookOffer.get("book")

            var userTo
            var userFrom

            if (endedOffer) {
                userTo = userWant
                userFrom = userOffer
            }else if(endedWant){
                userTo = userOffer
                userFrom = userWant
            }

            sendPush(transaction, userFrom, userTo, book, {
                message: function(nickname, bookTitle){
                    return nickname + " canceló, la transacción del libro: "+ bookTitle
                }},
                response
            )

        },
        error: function(error) {
            response.error(error)
            console.log(error)
        },
    })


}

/**
* Enviar la notificación, cuando se acepto
* la transacción, solo el dueño puede aceptar
* 
*/
function sendPushAcceptTransaction(transaction, response){
    var bookWant = transaction.get("bookWant")
    var bookOffer = transaction.get("bookOffer")
    var books = [bookWant, bookOffer]
    Parse.Object.fetchAll(books, {
        success: function(list) {
          
            var userTo = bookWant.get("user")
            var userFrom = bookOffer.get("user")                
            var book = bookOffer.get("book")

            sendPush(transaction, userFrom, userTo, book, 
                {
                    message: function(nickname, bookTitle){
                        return  nickname + " acepto la solicitud del libro: "+ bookTitle
                    }
                },
                response
            )

        },
        error: function(error) {
            response.error(error)
            console.log(error)
        },
    })
}

Parse.Cloud.afterSave("Transaction", function(request) {

    var response = { error: function(e){ console.log(e) },
        success: function(){  }  }

    Parse.Cloud.useMasterKey()

    var transaction = request.object

    /**
    * Si es una transaccion nueva, enviar push
    * La pregunta es si esto se hace en afterSave, 
    * y no importa si la persona recibe o no la transacción
    * La ventaja es que se puede enviar a la persona directo a
    * la transacción como tal
    */
    if(!transaction.existed()){
        sendPushNewTransaction(transaction, response)
    }

    /**
    * Si es una transaccion nueva  
    * Incrementar transactionCount de want y offer myBooks
    * Si la transaccion se cierra
    * descontar el contador?
    */
    var want = transaction.get("bookWant")
    var offer = transaction.get("bookOffer")

    var endedWant = transaction.get("endedWant")
    var endedOffer = transaction.get("endedOffer")      

    if(!transaction.existed() || endedWant || endedOffer){

        var functionCount = "updateMyBookCounters"
        var paramsWant = { myBookId: want.id }
        var paramsOffer = { myBookId: offer.id }

        Parse.Cloud.run(functionCount, paramsWant).then(function() {
            return Parse.Cloud.run(functionCount, paramsOffer)
        }, response.error).then(function() {
            response.success()
        }, response.error)

    }

})


Parse.Cloud.beforeSave("Transaction", function(request, response) {
    
    
    /**
    * el dueño de la transaction son los usuarios en cuestion
    */
    Parse.Cloud.useMasterKey()
    var transaction = request.object

    if(!transaction.isNew()){
        var accepted = transaction.get("accepted")
        if (accepted){
            sendPushAcceptTransaction(transaction, response)
        }else{
            response.success()
        }
    }else{
        response.success()
    }

})