Parse.Cloud.define("search", function(request, response) {

	bookCollection = new BookCollection()
    bookCollection.query = request.params.query
    bookCollection.fetch({
        success:function(collection){

            console.log("success fetch: "+ collection.length )

            response.success(collection)


        },
        error: function (collection, error) {
        	response.error(error)
        }
    })

})