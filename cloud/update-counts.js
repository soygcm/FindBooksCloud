Parse.Cloud.define("updateMyBookCounters", function(request, response) {
    Parse.Cloud.useMasterKey()

    var MyBook = Parse.Object.extend("MyBook")
    var myBookId = request.params.myBookId
    var myBook = MyBook.createWithoutData(myBookId)

    var error = function(e){
        console.log(e)
        response.error(e)
    }

    myBook.fetch().then(function(myBook) {
        var type = myBook.get("type")

        var Transaction = Parse.Object.extend("Transaction")
        var query = new Parse.Query(Transaction)

        if(type == "OFFER"){
            query.equalTo("bookOffer", myBook)
            query.notEqualTo("endedOffer", true);
        }else if(type == "WANT"){
            query.equalTo("bookWant", myBook)
            query.notEqualTo("endedWant", true);
        }

        return query.count()
    }, error).then(function(count) {
        myBook.set("transactionCount", count)
        return myBook.save()
    }, error).then(function(object) {
        response.success(object)
    }, error)
})

Parse.Cloud.define("updateBookCounters", function(request, response) {
    Parse.Cloud.useMasterKey()

    var Book = Parse.Object.extend("Book")
    var id = request.params.id
    var type = request.params.type
    var book = Book.createWithoutData(id)

    var error = function(e){
        console.log(e)
        response.error(e)
    }
    
    var MyBook = Parse.Object.extend("MyBook")
    var query = new Parse.Query(MyBook)

    query.equalTo("book", book)
    query.equalTo("type", type)
    query.notEqualTo("deleted", true)

    var counter

    if(type == "OFFER"){
        counter = "offersCount"
    }else if(type == "WANT"){
        counter = "wantsCount"
    }

    query.count().then(function(count) {
        book.set(counter, count)
        return book.save()
    }, error).then(function(object) {
        response.success(object)
    }, error)
})

