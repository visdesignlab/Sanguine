import { useEffect, useRef } from "react";
import { FC, useState } from "react";
import { Button, Icon, Message, Modal, Segment } from "semantic-ui-react";

type Props = {
    openURL: boolean;
    shareUrl: string;
}

const shareStateUrlModal: FC<Props> = ({ openURL, shareUrl }: Props) => {

    const [openShareModal, setOpenShareModal] = useState<boolean>(false)
    const urlRef = useRef(null);

    useEffect(() => {
        setOpenShareModal(openURL)
    }, [openURL])

    return <Modal
        open={openShareModal}
        onClose={() => { setOpenShareModal(false) }}
    >
        <Modal.Header>
            Use the following URL to share your state
        </Modal.Header>
        <Modal.Content scrolling>
            <Message info>Length of URL: {shareUrl.length}</Message>
            <Segment
                ref={urlRef}
                //   textAlign="justified"
                style={{ wordWrap: 'anywhere' }}>
                {shareUrl}
            </Segment>
        </Modal.Content>
        <Modal.Actions>
            <Button
                icon
                className="copy-clipboard"
                data-clipboard-text={shareUrl}>
                <Icon name="copy"></Icon>
                Copy
            </Button>
        </Modal.Actions>
    </Modal>
}

export default shareStateUrlModal;