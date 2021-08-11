
import styled from "styled-components";
import SemanticDatePicker from 'react-semantic-ui-datepickers';
import { Basic_Gray, postop_color, preop_color, Third_Gray } from "./Constants";
import ListItem from '@material-ui/core/ListItem';
import { makeStyles, Theme, createStyles } from "@material-ui/core";

export const LayoutDiv = styled.div`
  width: 100vw;

`;

export const Title = styled.b`
    font-size:larger;
`

export const StyledDate = styled(SemanticDatePicker)`
  width:100%;
`

export const SurgeryNumText = styled(`text`)`
  text-anchor:end;
  alignment-baseline: middle;

`


export const SurgeryDiv = styled.td`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  alignment-baseline: hanging;
  text-align:left;
  text-shadow: 2px 2px 5px white;
 
`


interface SurgeryListProps {
    isSelected: boolean;
}

export const SurgeryListComp = styled(`tr`) <SurgeryListProps>`
  background:${props => props.isSelected ? "#ecbe8d" : 'none'};
  cursor: pointer;
  &:hover{
    background:#faeee1;
  }
`

export const LeftToolBarListItem = styled(ListItem)`
  
`

interface WelcomeTextProps {
    show: boolean;
}

export const WelcomeText = styled(`text`) < WelcomeTextProps>`
    display:${props => props.show ? "none" : "block"};
    font-size:xxx-large;
    fill:${Third_Gray};
    opacity:0.25;
    margin:20px;
`

export const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        formControl: {
            margin: theme.spacing(1),
            minWidth: "200px!important",
        },
        root: {
            '& > *': {
                margin: theme.spacing(0.5),
            },
        },
        img: {
            margin: 'auto!important',
            display: 'block!important',
            maxWidth: '100%!important',
            height: "40px!important"
        },
        centerAlignment: {
            textAlign: "center"
        },
        tinyFont: {
            fontSize: "xx-small!important"

        },
        containerWidth: {
            width: "100%",
            maxWidth: "none",
            overflow: "auto",
            height: "100%"
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
        }
    }),
);

export const useButtonStyles = makeStyles((theme: Theme) =>
    createStyles({
        preopButtonActive: {
            backgroundColor: preop_color,
            color: "white"
        },
        postopButtonActive: {
            backgroundColor: postop_color,
            color: "white"
        },
        gapButtonActive: {
            backgroundColor: Basic_Gray,
            color: "white"
        },
        preopButtonOutline: {
            color: preop_color,
            backgroundColor: "white"
        },
        postopButtonOutline: {
            color: postop_color,
            backgroundColor: "white"
        },
        gapButtonOutline: {
            color: Basic_Gray,
            backgroundColor: "white"
        }
    }))