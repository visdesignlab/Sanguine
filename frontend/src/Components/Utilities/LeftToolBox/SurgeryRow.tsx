import { scaleLinear } from 'd3-scale';
import { observer } from 'mobx-react-lite';
import {
  Dispatch, SetStateAction, useCallback, useContext, useRef, useState,
} from 'react';
import Store from '../../../Interfaces/Store';
import { ProcedureEntry } from '../../../Interfaces/Types/DataTypes';
import { SurgeryListComp, SurgeryDiv, SurgeryNumText } from '../../../Presets/StyledComponents';
import { ListSVG, SurgeryRect } from '../../../Presets/StyledSVGComponents';

function isOverflown(element: Element) {
  return element.scrollWidth > element.clientWidth;
}

type Props = {
    listItem: ProcedureEntry;
    isSelected: boolean;
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
  listItem, width, isSelected, expandedList, setExpandedList, isSubSurgery, highlighted, caseScaleDomain, caseScaleRange, parentSurgery,
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
      isSelected={highlighted}
    >

      <SurgeryDiv ref={spanRef} onClick={() => { store.selectionStore.updateProcedureSelection(listItem, isSelected, isSubSurgery ? parentSurgery : undefined); }}>
        {isSubSurgery
          ? (
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
            <>
              <span onClick={(event) => {
                if (expandedList.includes(listItem.procedureName)) {
                  setExpandedList(expandedList.filter((d) => d !== listItem.procedureName));
                } else {
                  setExpandedList([...expandedList, listItem.procedureName]);
                }
                event.stopPropagation();
              }}
              >
                {expandedList.includes(listItem.procedureName) ? '▼' : '►'}
              </span>
              <span
                onMouseOver={mouseOverHandler}
                onMouseLeave={mouseLeaveHandler}
              >
                {listItem.procedureName}
              </span>
            </>
          )}

      </SurgeryDiv>
      <td style={{ display: showSVG ? undefined : 'none', }}>
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
