import React, { FC, useState, useEffect } from 'react';
import { inject, observer } from 'mobx-react';
import Store from './Interfaces/Store';
import { Button, Grid, Container, Modal, Message, Icon, Menu, Checkbox } from 'semantic-ui-react';
import { actions, provenance } from '.';

import SideBar from './Components/Utilities/SideBar';
import styled from 'styled-components';

import './App.css'
//import 'react-grid-layout/css/styles.css'
import { NavLink } from 'react-router-dom';
import LayoutGenerator from './LayoutGenerator';
import { timeFormat } from 'd3';

interface OwnProps {
    store?: Store
    provenanceState?: string;
}
type Props = OwnProps;

const Preview: FC<Props> = ({ store, provenanceState }: Props) => {

    const { showZero } = store!;

    const [hemoData, setHemoData] = useState<any>([])

    const [loadingModalOpen, setloadingModalOpen] = useState(true)

    useEffect(() => {
        if (provenanceState) {
            console.log(provenanceState)
            provenance.importState(provenanceState)
        }
    }
        , [provenanceState])

    async function cacheHemoData() {
        const resHemo = await fetch("http://localhost:8000/api/hemoglobin");
        const dataHemo = await resHemo.json();
        const resultHemo = dataHemo.result;
        const resTrans = await fetch(`http://localhost:8000/api/request_transfused_units?transfusion_type=ALL_UNITS&date_range=${[timeFormat("%d-%b-%Y")(new Date(2014, 0, 1)), timeFormat("%d-%b-%Y")(new Date(2019, 11, 31))]}`)
        const dataTrans = await resTrans.json();
        let transfused_dict = {} as any;

        let result: {
            CASE_ID: number,
            VISIT_ID: number,
            PATIENT_ID: number,
            ANESTHOLOGIST_ID: number,
            SURGEON_ID: number,
            YEAR: number,
            QUARTER: string,
            MONTH: string,
            DATE: Date | null,
            PRBC_UNITS: number,
            FFP_UNITS: number,
            PLT_UNITS: number,
            CRYO_UNITS: number,
            CELL_SAVER_ML: number,
            HEMO: number[]
        }[] = [];


        dataTrans.forEach((element: any) => {
            transfused_dict[element.case_id] = {
                PRBC_UNITS: element.transfused_units[0] || 0,
                FFP_UNITS: element.transfused_units[1] || 0,
                PLT_UNITS: element.transfused_units[2] || 0,
                CRYO_UNITS: element.transfused_units[3] || 0,
                CELL_SAVER_ML: element.transfused_units[4] || 0
            };
        });

        resultHemo.map((ob: any, index: number) => {
            if (transfused_dict[ob.CASE_ID]) {
                const transfusedResult = transfused_dict[ob.CASE_ID];
                result.push({
                    CASE_ID: ob.CASE_ID,
                    VISIT_ID: ob.VISIT_ID,
                    PATIENT_ID: ob.PATIENT_ID,
                    ANESTHOLOGIST_ID: ob.ANESTHOLOGIST_ID,
                    SURGEON_ID: ob.SURGEON_ID,
                    YEAR: ob.YEAR,
                    PRBC_UNITS: transfusedResult.PRBC_UNITS,
                    FFP_UNITS: transfusedResult.FFP_UNITS,
                    PLT_UNITS: transfusedResult.PLT_UNITS,
                    CRYO_UNITS: transfusedResult.CRYO_UNITS,
                    CELL_SAVER_ML: transfusedResult.CELL_SAVER_ML,
                    HEMO: ob.HEMO,
                    QUARTER: ob.QUARTER,
                    MONTH: ob.MONTH,
                    DATE: ob.DATE
                })
            }
        })

        result = result.filter((d: any) => d);
        console.log("hemo data done")
        setHemoData(result)
        setloadingModalOpen(false)
    }

    useEffect(() => {
        cacheHemoData();
    }, []);

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