
import { RootStore } from "./Store";

export const getUser = () => {
    const userStr = sessionStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    else return null;
};

export const tokenCheckCancel = (previousCancelToken: any) => {
    if (previousCancelToken) {
        previousCancelToken.cancel("cancel the call");
    }
};

export const getToken = () => {
    return sessionStorage.getItem('token') || null;
};

// remove the token and user from the session storage
export const removeUserSession = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
};

// set the token and user from the session storage
export const setUserSession = (token: string, user: any) => {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
};

export function getCookie (name: string) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i].replace(/\s+/g, '');
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

export const whoamiAPICall = (store: RootStore) => {

    fetch(`${import.meta.env.REACT_APP_QUERY_URL}whoami`, {
        method: 'GET',
        credentials: "include",
        headers: {
            "Access-Control-Allow-Origin": 'https://bloodvis.chpc.utah.edu',
            "Access-Control-Allow-Credentials": "true",
        },
    }).then(response => {
        if (response.status === 200) {
            store.configStore.isLoggedIn = true;
        } else {
            store.configStore.isLoggedIn = false;
            window.location.replace(`${import.meta.env.REACT_APP_QUERY_URL}accounts/login/`);
        }
    });
};

export const simulateAPIClick = () => {
    fetch(`${import.meta.env.REACT_APP_QUERY_URL}accounts/login/`, {
        method: 'GET',
        credentials: 'include',
    });
    var csrftoken = getCookie('csrftoken');
    return csrftoken;
};

export const logoutHandler = () => {
    window.location.replace(`${import.meta.env.REACT_APP_QUERY_URL}accounts/logout`);

};