import React, { FC, useRef, FunctionComponent } from 'react';
import { inject, observer } from 'mobx-react';
import Store from './Interfaces/Store';
import { Grid, Container, Modal, Message, Icon } from 'semantic-ui-react';
import UserControl from './Components/Utilities/UserControl';
import SideBar from './Components/Utilities/SideBar';
import styled from 'styled-components';
import './App.css'
//import 'react-grid-layout/css/styles.css'
import LayoutGenerator from './LayoutGenerator';
import { select } from 'd3';


interface OwnProps {
    store?: Store
    hemoData: any
}
type Props = OwnProps;

const Dashboard: FC<Props> = ({ hemoData, store }: Props) => {

    const { loadingModalOpen } = store!;
    select("#Main-Body").append("div").attr("class", "tooltiptext")

    return (
        <LayoutDiv>
            <Container fluid id="Top-Bar">
                <UserControl />
            </Container>
            <Grid padded >
                <SpecialPaddingColumn width={2} id="Side-Bar">
                    <SideBar hemoData={hemoData} />
                </SpecialPaddingColumn>
                <Grid.Column width={14} id="Main-Body">
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

export default inject('store')(observer(Dashboard))
const LayoutDiv = styled.div`
  width: 100vw;
  height: 100vh;
`;

const SpecialPaddingColumn = styled(Grid.Column)`
  &&&&&{padding-left:5px;}
`;