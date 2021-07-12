import { observer } from "mobx-react";
import { useContext } from "react";
import { FC } from "react";
import { Icon, Message, Modal } from "semantic-ui-react";
import Store from "../../Interfaces/Store";

type Props = {
    errorMessage?: string;
}

const DataRetrievalModal: FC<Props> = ({ errorMessage }: Props) => {
    const store = useContext(Store)
    return <Modal open={store.configStore.dataLoading || store.configStore.dataLoadingFailed} closeOnEscape={false}
        closeOnDimmerClick={false}>
        <Message icon>
            {store.configStore.dataLoadingFailed ?
                ([<Icon name='warning sign' />,
                <Message.Content>
                    <Message.Header>Failed</Message.Header>
                    Data retrieval failed.
                    {errorMessage!}
                    Please try later or contact the admins.
                </Message.Content>]) :
                ([<Icon name='circle notched' loading />,
                <Message.Content>
                    <Message.Header>Just one second</Message.Header>
                    We are fetching required data.
                </Message.Content>])}

        </Message>
    </Modal>
}
export default observer(DataRetrievalModal)