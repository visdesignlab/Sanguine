import React, { FC } from 'react';
import { inject, observer } from 'mobx-react';
import Store from './Interfaces/Store';
import { Button, Grid, Container, Modal, Message, Icon, Menu, Checkbox } from 'semantic-ui-react';
import { actions } from '.';

import SideBar from './Components/Utilities/SideBar';
import styled from 'styled-components';

import './App.css'
//import 'react-grid-layout/css/styles.css'
import { NavLink } from 'react-router-dom';
import LayoutGenerator from './LayoutGenerator';

interface OwnProps {
    store?: Store
    hemoData: any

}
type Props = OwnProps;

const Preview: FC<Props> = ({ store, hemoData }: Props) => {

    const { showZero, loadingModalOpen } = store!;

    return (
        <LayoutDiv>
            <Container fluid>
                <Menu widths={3}>
                    <Menu.Item>
                        <Checkbox
                            checked={showZero}
                            onClick={actions.toggleShowZero}
                            label={<label> Show Zero Transfused </label>}
                        />
                    </Menu.Item>
                    <Menu.Item>
                        {/* <NavLink component={Button} to="/dashboard" >
                            Customize Mode
                </NavLink> */}
                        <Button content="Customize Mode" onClick={() => { store!.previewMode = false }} />
                    </Menu.Item>
                    <Menu.Item>
                        <NavLink component={Button} to="/" onClick={() => { store!.isLoggedIn = false; }} >
                            Log Out
                    </NavLink>
                    </Menu.Item>
                </Menu>
            </Container>
            <Grid padded>
                <SpecialPaddingColumn width={3} >
                    <SideBar></SideBar>
                </SpecialPaddingColumn>
                <Grid.Column width={13}>
                    <LayoutGenerator hemoData={hemoData} />
                </Grid.Column>

            </Grid>
            <Modal open={loadingModalOpen} closeOnEscape={false}
                closeOnDimmerClick={false}>
                <Message icon>
                    <Icon name='circle notched' loading />
                    <Message.Content>
                        <Message.Header>Just one second</Message.Header>
                        We are fetching required data.
                        </Message.Content>
                </Message>

            </Modal>
        </LayoutDiv>

    );

}

export default inject('store')(observer(Preview))
const LayoutDiv = styled.div`
  width: 100vw;
  height: 100vh;
`;

const SpecialPaddingColumn = styled(Grid.Column)`
  &&&&&{padding-left:5px;}
`;