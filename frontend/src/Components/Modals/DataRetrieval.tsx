import { CircularProgress, Dialog, DialogContent, DialogContentText, DialogTitle, Grid } from "@material-ui/core";
import { observer } from "mobx-react";
import { useContext } from "react";
import { FC } from "react";

import Store from "../../Interfaces/Store";

type Props = {
    errorMessage?: string;
};

const DataRetrievalModal: FC<Props> = ({ errorMessage }: Props) => {
    const store = useContext(Store);
    return <Dialog open={store.configStore.dataLoading || store.configStore.dataLoadingFailed
    } >
        {store.configStore.dataLoadingFailed ?
            (<>
                <DialogTitle>Failed</DialogTitle>
                <DialogContent >
                    <DialogContentText>
                        Data retrieval failed. Please try later or contact the admins.
                    </DialogContentText>
                </DialogContent>
            </>) :
            (<>
                <DialogTitle>Just one second</DialogTitle>
                <DialogContent >
                    <Grid container spacing={2}>
                        <Grid item>
                            <CircularProgress />
                        </Grid>
                        <Grid item style={{ alignSelf: "center" }}>
                            <DialogContentText>

                                We are fetching required data.
                            </DialogContentText>
                        </Grid>
                    </Grid>
                </DialogContent>
            </>)}
    </Dialog>;
};
export default observer(DataRetrievalModal);