from django.http import HttpResponse

def index(request):
    return HttpResponse("Bloodvis API endpoint. Please use the client application to access the data here.")