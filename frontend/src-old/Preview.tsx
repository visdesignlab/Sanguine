import React, { FC, useState, useEffect } from 'react';
import { inject, observer } from 'mobx-react';
import Store from './Interfaces/Store';
import { Button, Grid, Container, Modal, Message, Icon, Menu, Image, Header } from 'semantic-ui-react';

import SideBar from './Components/Utilities/SideBar';
import styled from 'styled-components';

import './App.css'
//import 'react-grid-layout/css/styles.css'
//import { NavLink } from 'react-router-dom';
import LayoutGenerator from './LayoutGenerator';
import { select } from 'd3';
import DetailView from './Components/Utilities/DetailView';

interface OwnProps {
    store?: Store
    hemoData: any

}
type Props = OwnProps;

const Preview: FC<Props> = ({ store, hemoData }: Props) => {

    const { loadingModalOpen, dataLoadingFailed } = store!;
    select("#Main-Body").append("div").attr("class", "tooltiptext");
    const [openWarning, setOpenWarning] = useState(false)

    const isChrome = !!(window as any).chrome && (!!(window as any).chrome.webstore || !!(window as any).chrome.runtime);

    useEffect(() => {
        setOpenWarning(!isChrome)
    }, [isChrome])

    return (
        <LayoutDiv>
            <Container fluid id="Top-Bar">
                <Menu widths={3}>
                    <Menu.Item>
                        <Image
                            style={{ height: "40px" }}
                            size="small"
                            as='a'
                            target="_blank"
                            src="https://raw.githubusercontent.com/visdesignlab/visdesignlab.github.io/master/assets/images/logos/vdl.png"
                            href="https://vdl.sci.utah.edu"
                        />

                    </Menu.Item>
                    <Menu.Item>

                        <Button content="Customize Mode" onClick={() => { store!.previewMode = false }} />
                    </Menu.Item>
                    <Menu.Item>
                        <Button onClick={() => { store!.isLoggedIn = false; }} >
                            Log Out
                    </Button>

                    </Menu.Item>
                </Menu>
            </Container>
            <Grid padded >
                <SpecialPaddingColumn width={2} id="Side-Bar" >
                    <SideBar hemoData={hemoData}></SideBar>
                </SpecialPaddingColumn>
                <Grid.Column width={12} id="Main-Body">
                    <LayoutGenerator hemoData={hemoData} />
                </Grid.Column>
                <Grid.Column width={2}>
                    <DetailView hemoData={hemoData} />
                </Grid.Column>

            </Grid>
            <Modal
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
            <Modal open={loadingModalOpen} closeOnEscape={false}
                closeOnDimmerClick={false}>
                <Message icon>
                    {dataLoadingFailed ?
                        ([<Icon name='warning sign' />,
                        <Message.Content>
                            <Message.Header>Failed</Message.Header>
                        Data retrieval failed. Please try later or contact the admins.
                    </Message.Content>]) :
                        ([<Icon name='circle notched' loading />,
                        <Message.Content>
                            <Message.Header>Just one second</Message.Header>
                        We are fetching required data.
                    </Message.Content>])}
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