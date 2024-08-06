import ast
from django.http import (
    HttpResponse,
    JsonResponse,
    HttpResponseBadRequest,
    HttpResponseNotFound,
    HttpResponseForbidden,
)
from django.forms.models import model_to_dict
from django.contrib.auth.models import User
from django.views.decorators.http import require_http_methods
from django_cas_ng.decorators import login_required

from api.models import State, StateAccess, AccessLevel
from backend.api.views.utils.utils import log_request


@require_http_methods(["GET", "POST", "PUT", "DELETE"])
@login_required
def state(request):
    log_request(request, ["definition", "new_definition", ])

    if request.method == "GET":
        # Get the name from the querystring
        name = request.GET.get("name")
        user = request.user

        if name:
            # Get the object from the database and all related StateAccess objects
            try:
                state = State.objects.get(name=name)  # username = uid
            except State.DoesNotExist:
                return HttpResponseNotFound("State not found")
            state_access = StateAccess.objects.filter(state=state).filter(user=user)

            # Make sure that user is owner or at least reader
            if not (str(state.owner) == str(user) or state_access or state.public):
                return HttpResponseForbidden("Not authorized")

            # Return the json for the state
            return JsonResponse(model_to_dict(state))

        else:
            # Get the names of all the state objects that a user can access
            states = [o.name for o in State.objects.all().filter(owner=user)]
            state_access = [o.state.name for o in StateAccess.objects.filter(user=user)]
            public_states = [o.name for o in State.objects.all().filter(public=True)]

            response = set(states + state_access + public_states)

            # Return the names as a list
            return JsonResponse(list(response), safe=False)

    elif request.method == "POST":
        # Get the name and definition from the request
        name = request.POST.get("name")
        definition = request.POST.get("definition")
        owner = request.user
        public_request = request.POST.get("public")

        public = True if public_request == "true" else False

        if State.objects.filter(name=name).exists():
            return HttpResponseBadRequest(
                "a state with that name already exists, try another"
            )

        if name and definition:  # owner is guaranteed by login
            # Create and save the new State object
            new_state = State(
                name=name, definition=definition, owner=owner, public=public
            )
            new_state.save()

            return HttpResponse("state object created", 200)
        else:
            return HttpResponseBadRequest("missing params: [name, definition, owner]")

    elif request.method == "PUT":
        # Get the required information from the request body
        put = ast.literal_eval(request.body.decode())
        old_name = put.get("old_name")
        new_name = put.get("new_name")
        new_definition = put.get("new_definition")
        new_public_request = put.get("new_public")

        new_public = True if new_public_request == "true" else False

        owned_states = [o.name for o in State.objects.all().filter(owner=request.user)]
        public_states = [o.name for o in State.objects.all().filter(public=True)]
        writable_states = [
            o.state.name
            for o in StateAccess.objects.filter(user=request.user).filter(role="WR")
        ]
        readable_states = [
            o.state.name
            for o in StateAccess.objects.filter(user=request.user).filter(role="RE")
        ]
        all_accessible_states = set(
            owned_states + public_states + writable_states + readable_states
        )
        all_modifiable_states = set(owned_states + writable_states)

        if old_name not in all_accessible_states:
            return HttpResponseNotFound("State not found")
        if old_name not in all_modifiable_states:
            return HttpResponseForbidden("Not authorized")

        # Update the State object and save
        result = State.objects.get(name=old_name)
        result.name = new_name
        result.definition = new_definition
        result.public = new_public
        result.save()

        return HttpResponse("state object updated", 200)

    elif request.method == "DELETE":
        # Get the required information from the request body
        delete = ast.literal_eval(request.body.decode())
        name = delete.get("name")

        # Delete the matching State object
        try:
            result = State.objects.get(name=name)  # username = uid
        except State.DoesNotExist:
            return HttpResponseNotFound("State not found")

        if str(result.owner) != str(request.user):
            return HttpResponseForbidden("Requester is not owner")

        StateAccess.objects.all().filter(state_id=result.id).delete()

        result.delete()

        return HttpResponse("state object deleted", 200)


@require_http_methods(["POST"])
@login_required
def share_state(request):
    log_request(request)

    name = request.POST.get("name")
    user = request.POST.get("user")
    role = request.POST.get("role")

    requesting_user = request.user

    if role not in [a[1] for a in AccessLevel.choices()]:
        return HttpResponseBadRequest(
            f"role must be in: {[a[1] for a in AccessLevel.choices()]}"
        )

    try:
        state_object = State.objects.get(name=name)
    except State.DoesNotExist:
        return HttpResponseNotFound("State not found")

    try:
        user_object = User.objects.get(username=user)  # username = uid
    except User.DoesNotExist:
        return HttpResponseBadRequest("User does not exist")

    # Make sure state exists, requesting users is owner, and new user is not owner, user exists
    if str(state_object.owner) != str(requesting_user):
        return HttpResponseForbidden("Requesting user is not the owner")
    if str(state_object.owner) == str(user):
        return HttpResponseBadRequest("User is already the owner of the state")

    # Check that new user is not already reader/writer, role in allowed choices
    state_access_object = StateAccess.objects.filter(state=state_object).filter(
        user=user
    )
    roles = [a.role for a in state_access_object]
    if state_access_object.count() > 0:
        if state_access_object.count() == 1:
            state_access_object = state_access_object.first()
            state_access_object.role = role
            state_access_object.save()
            return HttpResponse("Updated user role", 200)
        else:
            return HttpResponse(
                "This user already has multiple access roles", status=500
            )

    # If all above passed, make the StateAccess object
    StateAccess.objects.create(
        state=state_object,
        user=user,
        role=role,
    )
    return HttpResponse("Added new user to role", 201)


@require_http_methods(["GET"])
@login_required
def state_unids(request):
    log_request(request)

    state_name = request.GET.get("state_name")

    try:
        state = State.objects.get(name=state_name)  # username = uid
    except State.DoesNotExist:
        return HttpResponseNotFound("State not found")
    state_access = StateAccess.objects.filter(state=state)

    users_and_roles = [(access.user, access.role) for access in state_access]

    response = {
        "owner": state.owner,
        "users_and_roles": users_and_roles,
    }

    return JsonResponse(response)
