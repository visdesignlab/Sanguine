import { scaleLinear } from 'd3-scale';
import { observer } from 'mobx-react-lite';
import {
  Dispatch, SetStateAction, useCallback, useContext, useRef, useState,
} from 'react';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Store from '../../../Interfaces/Store';
import { ProcedureEntry } from '../../../Interfaces/Types/DataTypes';
import { SurgeryListComp, SurgeryDiv, SurgeryNumText } from '../../../Presets/StyledComponents';
import { ListSVG, SurgeryRect } from '../../../Presets/StyledSVGComponents';

function isOverflown(element: Element) {
  return element.scrollWidth > element.clientWidth;
}

type Props = {
    listItem: ProcedureEntry;
    selected: boolean;
    isSubSurgery: boolean;
    highlighted: boolean;
    caseScaleDomain: string;
    caseScaleRange: string;
    width: number;
    parentSurgery?: ProcedureEntry;
    expandedList: string[];
    setExpandedList: Dispatch<SetStateAction<string[]>>;
};
function SurgeryRow({
  listItem, width, selected, expandedList, setExpandedList, isSubSurgery, highlighted, caseScaleDomain, caseScaleRange, parentSurgery,
}: Props) {
  const [showSVG, setShowSVG] = useState(true);
  const spanRef = useRef(null);

  const caseScale = useCallback(() => scaleLinear().domain(JSON.parse(caseScaleDomain)).range(JSON.parse(caseScaleRange)), [caseScaleDomain, caseScaleRange]);

  const mouseOverHandler = () => {
    if (spanRef.current) {
      if (isOverflown(spanRef.current)) {
        setShowSVG(false);
      }
    }
  };

  const mouseLeaveHandler = () => {
    setShowSVG(true);
  };

  const store = useContext(Store);

  return (
    <SurgeryListComp
      key={`${isSubSurgery && parentSurgery ? `${parentSurgery}-` : ''}${listItem.procedureName}`}
      selected={highlighted}
    >

      <SurgeryDiv ref={spanRef} onClick={() => { store.interactionStore.updateProcedureSelection(listItem, selected, isSubSurgery ? parentSurgery : undefined); }}>
        {isSubSurgery
          ? (
            // Sub-procedure row
            <>
              {' '}
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              {listItem.procedureName.includes('Only') ? '' : '+'}
              <span
                onMouseOver={mouseOverHandler}
                onMouseLeave={mouseLeaveHandler}
              >
                {listItem.procedureName}
              </span>
            </>
          )
          : (
            // Main-procedure row
            <>
              {/** If the main procedure is expanded or collapsed */}
              <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span onClick={(event) => {
                  if (expandedList.includes(listItem.procedureName)) {
                    setExpandedList(expandedList.filter((d) => d !== listItem.procedureName));
                  } else {
                    setExpandedList([...expandedList, listItem.procedureName]);
                  }
                  event.stopPropagation();
                }}
                >
                  {/** Expanded or collapsed icons */}
                  {expandedList.includes(listItem.procedureName)
                    ? <KeyboardArrowDownIcon fontSize="small" style={{ verticalAlign: 'middle' }} />
                    : <ChevronRightIcon fontSize="small" style={{ verticalAlign: 'middle' }} />}
                </span>
                {/** Main Procedure name */}
                <span
                  onMouseOver={mouseOverHandler}
                  onMouseLeave={mouseLeaveHandler}
                >
                  {listItem.procedureName}
                </span>
              </div>
            </>
          )}

      </SurgeryDiv>
      <td style={{ display: showSVG ? undefined : 'none' }}>
        <ListSVG widthInput={0.3 * width}>
          <SurgeryRect
            x={caseScale().range()[0]}
            width={caseScale()(listItem.count) - caseScale().range()[0]}
          />
          <SurgeryNumText y={9} x={caseScale().range()[1]}>{listItem.count}</SurgeryNumText>
        </ListSVG>
      </td>
    </SurgeryListComp>
  );
}

export default observer(SurgeryRow);
