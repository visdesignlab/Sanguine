
import { Basic_Gray, drawerWidth, Third_Gray } from "./Constants";
import { makeStyles, Theme, createStyles, ListItem, Container } from "@mui/material";
import styled from "@emotion/styled";
import { css } from '@emotion/react';

export const LayoutDiv = styled.div`
  width: 100vw;

`;

export const Title = styled.b`
    font-size:larger;
`;

export const SurgeryNumText = styled(`text`)`
  text-anchor:end;
  alignment-baseline: middle;
`;


export const CenterAlignedDiv = styled.div({
    textAlign: "center"
});


export const SurgeryDiv = styled.td`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  alignment-baseline: hanging;
  text-align:left;
  text-shadow: 2px 2px 5px white;
  &:hover{
    overflow: visible;
  }
`;

export const ChartWrapperContainer = styled(Container)({
    height: "100%!important"
});

export const ChartAccessoryDiv = styled.div({
    textAlign: "right",
    color: Basic_Gray
});

interface SurgeryListProps {
    isSelected: boolean;
}

export const SurgeryListComp = styled(`tr`) <SurgeryListProps>`
  background:${props => props.isSelected ? "#ecbe8d" : 'none'};
  cursor: pointer;
  &:hover{
    background:#faeee1;
  }
`;

interface WelcomeTextProps {
    show: boolean;
}

export const WelcomeText = styled(`text`) < WelcomeTextProps>`
    display:${props => props.show ? "none" : "block"};
    font-size:xxx-large;
    fill:${Third_Gray};
    opacity:0.25;
    margin:20px;
`;



export const allCss = {
    chartWrapper: {
        height: "100%!important",
    },
    toolbarPaddingControl: css({
        '& > *': {
            paddingLeft: "6px",
            paddingRight: "6px"
        },
    }),
    tooltipFont: css({
        fontSize: "small!important",
        textAlign: "center",
    }),
    root: css({
        '& > *': {
            margin: '0.5rem',
        },
    }),
    centerAlignment: css({
        textAlign: "center"
    }),
    containerWidth: css({
        width: "100%",
        paddingLeft: "5px",
        paddingRight: "5px",
        maxWidth: "none",
        overflow: "hidden",
        height: "100%",
        '&:hover': {
            overflow: "overlay"
        },
    }),
    gridWidth: css({
        width: "inherit!important"
    }),
    subheader: css({
        padding: "5px!important",
        backgroundColor: "white!important"
    }),
    manualDisable: css({
        color: "rgba(0, 0, 0, 0.26)"
    })
};

export const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        drawer: {
            width: drawerWidth,
            flexShrink: 0,
        },
        drawerPaper: {
            width: drawerWidth,
            padding: "10px"
        },
        toolbarPaddingControl: {
            '& > *': {
                paddingLeft: "6px",
                paddingRight: "6px"
            },
        },
        formControl: {
            margin: theme.spacing(1),
            minWidth: "200px!important",
        },
        root: {
            '& > *': {
                margin: theme.spacing(0.5),
            },
        },
        chartAccessoryDiv: {
            textAlign: "right",
            color: Basic_Gray
        },
        img: {
            margin: 'auto!important',

            display: 'block!important',
            maxWidth: '100%!important',
            height: "35px!important"
        },
        centerAlignment: {
            textAlign: "center"
        },
        tinyFont: {
            fontSize: "xx-small!important"

        },
        containerWidth: {
            width: "100%",
            paddingLeft: "5px",
            paddingRight: "5px",
            maxWidth: "none",
            overflow: "hidden",
            height: "100%",
            '&:hover': {
                overflow: "overlay"
            },
        },
        gridWidth: {
            width: "inherit!important"
        },
        chartWrapper: {
            height: "100%!important"
        },
        subheader: {
            padding: "5px!important",
            backgroundColor: "white!important"
        },
        tooltipFont: {
            fontSize: "small!important",
            textAlign: "center"
        },
        title: {
            flexGrow: 1,
            display: 'none',
            [theme.breakpoints.up('sm')]: {
                display: 'block',
            },
        },
        manualDisable: {
            color: "rgba(0, 0, 0, 0.26)"
        }
    }),
);