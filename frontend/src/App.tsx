import React, { FC, useEffect, useState } from 'react';
import Store from './Interfaces/Store'
import { inject, observer } from 'mobx-react';
import Dashboard from './Dashboard';
import { BrowserRouter, Switch, Route, NavLink } from 'react-router-dom'

import Login from './LogIn'
import Home from './Home'

interface OwnProps {
  store?: Store;
}

type Props = OwnProps;

const App: FC<Props> = ({ store }: Props) => {



  return (
    <BrowserRouter>
      <Switch>
        {/* <Route exact path='/' component={Home} /> */}
        <Route exact path='/' component={Login} />
        <Route path='/dashboard' component={Dashboard} />
      </Switch></BrowserRouter>

    // <Login />
    // <Dashboard hemoData={hemoData} />
  );
}

export default inject('store')(observer(App));
