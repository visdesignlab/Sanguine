import React, { FC, useState } from 'react';
import Store from './Interfaces/Store';
import { inject, observer } from 'mobx-react';
import { Form, Button } from 'semantic-ui-react';
import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom'
import $ from 'jquery';
import { render } from 'react-dom';

interface OwnProps {
    store?: Store
}

type Props = OwnProps;

const Logins: FC<Props> = ({ store }: Props) => {
    // const username = useFormInput('');
    // const password = useFormInput('');
    const { isLoggedIn } = store!
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const [username, setUserName] = useState<string | null>(null)
    const [password, setPassWord] = useState<string | null>(null)

    function getCookie(name: string) {
        var cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }


    const handleLogin = () => {
        // setError(null)
        // setLoading(true)
        // var csrftoken = getCookie('csrftoken');

        // //const requestOptions = ;
        // fetch(`http://localhost:8000/accounts/login/`, {
        //     method: 'POST',
        //     credentials: "include",
        //     headers: {
        //         'Accept': 'application/json',
        //         'Content-Type': 'application/json',
        //         'X-CSRFToken': csrftoken || '',
        //         "Access-Control-Allow-Origin": '*'
        //     },
        //     body: JSON.stringify({ username: username, password: password })

        // })
        //     .then(response => response.json())
        //     .then(data => { console.log(data); return <Redirect to="/dashboard" /> }).catch(error => {
        //         setLoading(false);
        //         console.log(error)
        //         if (error.response.status === 401) setError(error.response.data.message);
        //         else setError("something went wrong")
        //     })
        console.log("fasd")
        store!.isLoggedIn = true;


    }

    return (
        isLoggedIn ? <Redirect to="/dashboard" /> : <div>
            Login
            <Form onSubmit={() => handleLogin()}>
                <Form.Group>
                    <Form.Field>
                        <Form.Input label="Username" required onChange={(e, d) => { setUserName(d.value) }} />
                        {/* <label>Username</label>
                            <input placeholder='Username' /> */}
                    </Form.Field>
                    <Form.Field>
                        <Form.Input required label="Password" type="password" onChange={(e, d) => { setPassWord(d.value) }}>
                        </Form.Input>
                    </Form.Field>
                    <Form.Button content="Login" />
                </Form.Group>

            </Form>
        </div >
    );
}



export default inject('store')(observer(Logins));
