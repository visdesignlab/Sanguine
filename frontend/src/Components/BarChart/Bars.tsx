import React, { FC, useEffect, useMemo } from "react";
import Store from "../../Interfaces/Store";
import { inject, observer } from "mobx-react";
import {
  scaleLinear,
  scaleBand,
  min,
  max,
  select,
  axisBottom,
  axisLeft,
  selectAll
} from "d3";
import styled from "styled-components";
import { actions } from "../..";

interface OwnProps{
    store?: Store;
    height: number;
    width: number;
    data:any
}

type Props = OwnProps

const Bars: FC<Props> = ({ store, width, height, data }: Props) => {
    console.log(data)
    return(<></>)
}

export default inject ('store')(observer(Bars))