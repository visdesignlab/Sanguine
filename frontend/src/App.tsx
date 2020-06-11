import React, { FC, useEffect, useState, Component } from 'react';
import Store from './Interfaces/Store'
import { inject, observer } from 'mobx-react';
import Dashboard from './Dashboard';
import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom'

import Login from './LogIn'
import Preview from './Preview';

interface OwnProps {
  store?: Store;
}

type Props = OwnProps;

const App: FC<Props> = ({ store }: Props) => {
  const { isLoggedIn, previewMode } = store!


  return (
    <BrowserRouter>
      <Switch>
        {/* <Route exact path='/' component={Home} /> */}

        <Route exact path='/dashboard' render={() => {
          // if (isLoggedIn) return <Dashboard />
          // else return <Redirect to="/" />
          if (previewMode) {
            return <Preview />
          }
          else {
            return <Dashboard />
          }
        }} />
        <Route path='/' component={Login} />
        {/* <Route exact path='/preview' render={()=>{}}/> */}
      </Switch></BrowserRouter>

    // <Login />
    // <Dashboard hemoData={hemoData} />
  );
}

export default inject('store')(observer(App));
