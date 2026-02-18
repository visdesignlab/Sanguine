import { apiPath } from '../Utils/api';

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

export async function whoamiAPICall() {
  const result = await fetch(apiPath('whoami'), {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Access-Control-Allow-Credentials': 'true',
    },
  });
  if (result.status !== 200) {
    window.location.replace(apiPath('accounts/login/'));
  }
}

export const simulateAPIClick = () => {
  fetch(apiPath('accounts/login/'), {
    method: 'GET',
    credentials: 'include',
  });
  const csrftoken = getCookie('csrftoken');
  return csrftoken;
};

export const logoutHandler = () => {
  window.location.replace(apiPath('accounts/logout/'));
};
