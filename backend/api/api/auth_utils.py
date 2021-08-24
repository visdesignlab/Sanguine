from django.http import HttpResponse


def whoami(request):
    if request.user.is_authenticated:
        return HttpResponse(request.user.username)
    else:
        return HttpResponse('Unauthorized', status=401)
