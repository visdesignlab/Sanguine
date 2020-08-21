import React, { FC, useState, useEffect } from 'react';
import Store from './Interfaces/Store';
import { inject, observer } from 'mobx-react';
import { Form, Container, Header, Message, Image, Modal, Button } from 'semantic-ui-react';
import { Redirect } from 'react-router-dom'
import { getCookie } from './Interfaces/UserManagement';


interface OwnProps {
    store?: Store
}

type Props = OwnProps;

const Logins: FC<Props> = ({ store }: Props) => {
    // const username = useFormInput('');
    // const password = useFormInput('');
    const { isLoggedIn } = store!;





    const [hideErrorMessage, setError] = useState<boolean>(true);

    const [openWarning, setOpenWarning] = useState(false)
    const [username, setUserName] = useState<string | null>(null)
    const [password, setPassWord] = useState<string | null>(null)


    const isChrome = !!(window as any).chrome && (!!(window as any).chrome.webstore || !!(window as any).chrome.runtime);

    useEffect(() => {
        setOpenWarning(!isChrome)
    }, [isChrome])


    useEffect(() => {
        fetch(`${process.env.REACT_APP_QUERY_URL}accounts/login/`, {
            method: 'GET',
            credentials: 'include',
        })
        var csrftoken = getCookie('csrftoken');
        //I guess this is how to include credentials?
        fetch(`${process.env.REACT_APP_QUERY_URL}whoami`, {
            method: 'GET',
            credentials: "include",
            headers: {
                'Accept': 'application/x-www-form-urlencoded',
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrftoken || '',
                "Access-Control-Allow-Origin": 'https://bloodvis.chpc.utah.edu',
                "Access-Control-Allow-Credentials": "true",
            },
        }).then(response => {
            //TODO if logged in, it is 200 right?
            if (response.status === 200) {
                store!.isLoggedIn = true;
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])




    const handleLogin = async () => {
        setError(true)

        // Get the csrf cookie by visiting the site
        fetch(`${process.env.REACT_APP_QUERY_URL}accounts/login/`, {
            method: 'GET',
            credentials: 'include',
        })
        var csrftoken = getCookie('csrftoken');
        console.log(csrftoken)
        //store!.csrftoken = csrftoken

        // Post the log in data to the site with the cookie
        fetch(`${process.env.REACT_APP_QUERY_URL}accounts/login/`, {
            method: 'POST',
            credentials: "include",
            headers: {
                'Accept': 'application/x-www-form-urlencoded',
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrftoken || '',
                "Access-Control-Allow-Origin": 'https://bloodvis.chpc.utah.edu',
                "Access-Control-Allow-Credentials": "true",
            },
            body: `csrfmiddlewaretoken=${csrftoken}&username=${username}&password=${password}`

        })
            .then(response => { console.log(response); return response })
            .then(data => {
                if (data.redirected) {
                    store!.isLoggedIn = true;
                } else {
                    setUserName("")
                    setPassWord("")
                    setError(false)

                }

            })
            .catch(error => {

                console.log(error)
                // if (error.response.status === 401) setError(error.response.data.message);
                // else setError("something went wrong")
            })

    }

    const generateOutput = () => {
        if (isLoggedIn) {
            return (<Redirect to="/dashboard" />)
        } else {
            return (<Container style={{ padding: 50 }}>

                <Modal basic
                    open={openWarning}>
                    <Header icon="warning sign" content="Warning" />
                    <Modal.Content>
                        <p>This application is designed to be used on Chrome.</p>
                        <p>Using it on other browsers may cause inaccurate visual representations of the data.</p>
                    </Modal.Content>
                    <Modal.Actions>
                        <Button onClick={() => setOpenWarning(false)}>I understand</Button>
                    </Modal.Actions>
                </Modal>

                <Header as='h1'>Welcome to BloodVis</Header>
                <Image size="small"
                    as='a'
                    target="_blank"
                    src="https://raw.githubusercontent.com/visdesignlab/visdesignlab.github.io/master/assets/images/logos/vdl.png"
                    href="https://vdl.sci.utah.edu"
                />
                <Header as='h3'>Log in</Header>
                <Form onSubmit={() => handleLogin()}>
                    <Form.Input
                        width={10}
                        label="Username"
                        value={username}
                        required
                        onChange={(e, d) => { setUserName(d.value) }} />

                    <Form.Input
                        required
                        width={10}
                        label="Password"
                        value={password}
                        type="password"
                        onChange={(e, d) => { setPassWord(d.value) }} />

                    <Form.Button content="Login" />
                </Form>
                <Message hidden={hideErrorMessage} icon="user x" content="Log in failed. Please check your username and password."></Message>
            </Container>)
        }
    }

    return (

        generateOutput()

    );
}



export default inject('store')(observer(Logins));
