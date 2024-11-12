import { RootStore } from './Store';

function getCookie(name: string) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i += 1) {
      const cookie = cookies[i].replace(/\s+/g, '');
      if (cookie.substring(0, name.length + 1) === (`${name}=`)) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

export const whoamiAPICall = (store: RootStore) => {
  fetch(`${import.meta.env.VITE_QUERY_URL}whoami`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Access-Control-Allow-Origin': 'https://bloodvis.chpc.utah.edu',
      'Access-Control-Allow-Credentials': 'true',
    },
  }).then((response) => {
    if (response.status === 200) {
      store.configStore.isLoggedIn = true;
    } else {
      store.configStore.isLoggedIn = false;
      window.location.replace(`${import.meta.env.VITE_QUERY_URL}accounts/login/`);
    }
  });
};

export const simulateAPIClick = () => {
  fetch(`${import.meta.env.VITE_QUERY_URL}accounts/login/`, {
    method: 'GET',
    credentials: 'include',
  });
  const csrftoken = getCookie('csrftoken');
  return csrftoken;
};

export const logoutHandler = () => {
  window.location.replace(`${import.meta.env.VITE_QUERY_URL}accounts/logout`);
};
